const shiprocketService = require('../Utils/shiprocketService');
const CustomerOrder = require('../Models/customerOrder');

// @desc    Get shipping rates for checkout
// @route   POST /api/website/shipping/rates
// @access  Public
const getShippingRates = async (req, res) => {
  try {
    const { deliveryPincode, items, pickupPincode } = req.body;

    if (!deliveryPincode || !items || items.length === 0) {
      return res.status(400).json({ 
        error: 'Delivery pincode and items are required' 
      });
    }

    // Calculate total weight and value
    const totalWeight = items.reduce((total, item) => {
      return total + (item.quantity * (item.weight || 0.5)); // Default 0.5kg per item
    }, 0);

    const totalValue = items.reduce((total, item) => {
      return total + (item.quantity * item.price);
    }, 0);

    const defaultPickupPincode = pickupPincode || '110001'; // Default pickup pincode

    // Get shipping rates from Shiprocket
    const ratesData = await shiprocketService.getShippingRates(
      defaultPickupPincode,
      deliveryPincode,
      totalWeight,
      totalValue
    );

    if (ratesData.status === 200 && ratesData.data) {
      const availableCouriers = ratesData.data.available_courier_companies || [];
      
      const shippingOptions = availableCouriers.map(courier => ({
        courierId: courier.courier_company_id,
        courierName: courier.courier_name,
        rate: courier.rate,
        estimatedDeliveryDays: courier.estimated_delivery_days,
        description: `${courier.courier_name} - ${courier.estimated_delivery_days} days`,
        codAvailable: courier.cod === 1,
        pickupAvailable: courier.pickup_available === 1,
        deliveryBoyContact: courier.delivery_boy_contact,
        trackingAvailable: courier.tracking_available === 1,
        weightCases: courier.weight_cases
      }));

      res.json({
        success: true,
        shippingOptions,
        serviceability: {
          available: true,
          pickupPincode: defaultPickupPincode,
          deliveryPincode,
          totalWeight,
          totalValue
        }
      });
    } else {
      res.status(400).json({
        error: 'No shipping options available for this location',
        details: ratesData.message || 'Service not available'
      });
    }
  } catch (error) {
    console.error('Get shipping rates error:', error);
    res.status(500).json({ 
      error: 'Failed to get shipping rates',
      details: error.message 
    });
  }
};

// @desc    Check serviceability for a pincode
// @route   GET /api/website/shipping/serviceability/:pincode
// @access  Public
const checkServiceability = async (req, res) => {
  try {
    const { pincode } = req.params;
    const { pickupPincode, weight = 1 } = req.query;

    if (!pincode) {
      return res.status(400).json({ error: 'Pincode is required' });
    }

    const defaultPickupPincode = pickupPincode || '110001';

    const serviceabilityData = await shiprocketService.checkServiceability(
      defaultPickupPincode,
      pincode,
      weight
    );

    res.json({
      success: true,
      serviceable: serviceabilityData.status === 200,
      data: serviceabilityData.data || {},
      message: serviceabilityData.message
    });
  } catch (error) {
    console.error('Check serviceability error:', error);
    res.status(500).json({ 
      error: 'Failed to check serviceability',
      details: error.message 
    });
  }
};

// @desc    Handle Shiprocket webhooks
// @route   POST /api/website/shipping/webhook
// @access  Public (but should be secured with webhook signature verification)
const handleWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    
    // Verify webhook signature (if implemented)
    const isValid = shiprocketService.verifyWebhook(webhookData, req.headers['x-shiprocket-signature']);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Process different webhook events
    const { order_id, current_status, awb, shipment_id, courier_name } = webhookData;

    if (order_id) {
      // Find the order in our database
      const order = await CustomerOrder.findOne({ orderNumber: order_id });
      
      if (order) {
        // Update order with webhook data
        const updateData = {};
        
        if (current_status) {
          updateData.currentStatus = current_status;
          updateData.currentStatusCode = webhookData.status_code;
          
          // Map Shiprocket status to our order status
          const statusMapping = {
            'PICKUP_SCHEDULED': 'confirmed',
            'PICKED_UP': 'processing',
            'IN_TRANSIT': 'shipped',
            'OUT_FOR_DELIVERY': 'shipped',
            'DELIVERED': 'delivered',
            'RTO': 'cancelled',
            'CANCELLED': 'cancelled'
          };
          
          if (statusMapping[current_status]) {
            updateData.orderStatus = statusMapping[current_status];
          }
          
          if (current_status === 'DELIVERED') {
            updateData.deliveredAt = new Date();
          }
        }
        
        if (awb) updateData.awbCode = awb;
        if (shipment_id) updateData.shipmentId = shipment_id;
        if (courier_name) updateData.courierName = courier_name;
        
        if (webhookData.pickup_scheduled_date) {
          updateData.pickupScheduledDate = new Date(webhookData.pickup_scheduled_date);
        }
        
        if (webhookData.expected_delivery_date) {
          updateData.expectedDeliveryDate = new Date(webhookData.expected_delivery_date);
        }

        await CustomerOrder.findByIdAndUpdate(order._id, updateData);
        
        console.log(`Order ${order_id} updated with status: ${current_status}`);
      }
    }

    res.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process webhook',
      details: error.message 
    });
  }
};

// @desc    Get order tracking information
// @route   GET /api/website/orders/:orderId/tracking
// @access  Private
const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.customer.id;

    const order = await CustomerOrder.findOne({
      _id: orderId,
      customer: customerId
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.shipmentId) {
      return res.json({
        success: true,
        tracking: {
          status: order.orderStatus,
          message: 'Order is being processed',
          trackingNumber: order.trackingNumber || null,
          estimatedDelivery: order.estimatedDelivery || null
        }
      });
    }

    // Get tracking information from Shiprocket
    const trackingData = await shiprocketService.trackOrder(order.shipmentId);

    res.json({
      success: true,
      tracking: {
        status: order.currentStatus || order.orderStatus,
        awbCode: order.awbCode,
        courierName: order.courierName,
        trackingUrl: order.trackingUrl,
        currentLocation: trackingData.tracking_data?.track_detail?.[0]?.location || null,
        estimatedDelivery: order.expectedDeliveryDate,
        trackingHistory: trackingData.tracking_data?.track_detail || [],
        shipmentDetails: trackingData.tracking_data || {}
      }
    });
  } catch (error) {
    console.error('Get order tracking error:', error);
    res.status(500).json({ 
      error: 'Failed to get tracking information',
      details: error.message 
    });
  }
};

// @desc    Get pickup locations
// @route   GET /api/admin/shipping/pickup-locations
// @access  Private (Admin only)
const getPickupLocations = async (req, res) => {
  try {
    const pickupLocations = await shiprocketService.getPickupLocations();
    
    res.json({
      success: true,
      pickupLocations: pickupLocations.data || []
    });
  } catch (error) {
    console.error('Get pickup locations error:', error);
    res.status(500).json({ 
      error: 'Failed to get pickup locations',
      details: error.message 
    });
  }
};

module.exports = {
  getShippingRates,
  checkServiceability,
  handleWebhook,
  getOrderTracking,
  getPickupLocations
};