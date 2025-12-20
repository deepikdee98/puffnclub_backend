const axios = require('axios');

class ShiprocketService {
  constructor() {
    this.baseURL = process.env.SHIPROCKET_API_URL || 'https://apiv2.shiprocket.in/v1/external';
    this.email = process.env.SHIPROCKET_EMAIL;
    this.password = process.env.SHIPROCKET_PASSWORD;
    this.channelId = process.env.SHIPROCKET_CHANNEL_ID;
    this.pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION;
    this.token = null;
    this.tokenExpiry = null;
  }

  // Authenticate and get token
  async authenticate() {
    try {
      if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.token;
      }

      const response = await axios.post(`${this.baseURL}/auth/login`, {
        email: this.email,
        password: this.password
      });

      if (response.data && response.data.token) {
        this.token = response.data.token;
        // Token typically expires in 10 days, set expiry to 9 days to be safe
        this.tokenExpiry = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
        return this.token;
      }

      throw new Error('Failed to authenticate with Shiprocket');
    } catch (error) {
      console.error('Shiprocket authentication error:', error.response?.data || error.message);
      throw new Error('Shiprocket authentication failed');
    }
  }

  // Get authenticated headers
  async getHeaders() {
    const token = await this.authenticate();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Check serviceability for delivery
  async checkServiceability(pickupPincode, deliveryPincode, weight = 1) {
    try {
      const headers = await this.getHeaders();
      
      const response = await axios.get(`${this.baseURL}/courier/serviceability`, {
        headers,
        params: {
          pickup_postcode: pickupPincode,
          delivery_postcode: deliveryPincode,
          weight: weight,
          cod: 1 // Cash on delivery enabled
        }
      });

      return response.data;
    } catch (error) {
      console.error('Serviceability check error:', error.response?.data || error.message);
      throw new Error('Failed to check serviceability');
    }
  }

  // Get shipping rates
  async getShippingRates(pickupPincode, deliveryPincode, weight, declaredValue) {
    try {
      const headers = await this.getHeaders();
      
      const response = await axios.post(`${this.baseURL}/courier/serviceability`, {
        pickup_postcode: pickupPincode,
        delivery_postcode: deliveryPincode,
        weight: weight,
        declared_value: declaredValue,
        cod: 1
      }, { headers });

      return response.data;
    } catch (error) {
      console.error('Shipping rates error:', error.response?.data || error.message);
      throw new Error('Failed to get shipping rates');
    }
  }

  // Create order in Shiprocket
  async createOrder(orderData) {
    try {
      const headers = await this.getHeaders();
      
      const shiprocketOrder = {
        order_id: orderData.orderNumber,
        order_date: orderData.orderDate || new Date().toISOString().split('T')[0],
        pickup_location: this.pickupLocation,
        channel_id: this.channelId,
        comment: orderData.notes || '',
        billing_customer_name: orderData.billingAddress.firstName + ' ' + orderData.billingAddress.lastName,
        billing_last_name: orderData.billingAddress.lastName,
        billing_address: orderData.billingAddress.street,
        billing_city: orderData.billingAddress.city,
        billing_pincode: orderData.billingAddress.zipCode,
        billing_state: orderData.billingAddress.state,
        billing_country: orderData.billingAddress.country,
        billing_email: orderData.billingAddress.email,
        billing_phone: orderData.billingAddress.phone,
        shipping_is_billing: orderData.shippingIsBilling || false,
        shipping_customer_name: orderData.shippingAddress.firstName + ' ' + orderData.shippingAddress.lastName,
        shipping_last_name: orderData.shippingAddress.lastName,
        shipping_address: orderData.shippingAddress.street,
        shipping_city: orderData.shippingAddress.city,
        shipping_pincode: orderData.shippingAddress.zipCode,
        shipping_state: orderData.shippingAddress.state,
        shipping_country: orderData.shippingAddress.country,
        shipping_email: orderData.shippingAddress.email,
        shipping_phone: orderData.shippingAddress.phone,
        order_items: orderData.items.map(item => ({
          name: item.productName,
          sku: item.product.toString(),
          units: item.quantity,
          selling_price: item.price,
          discount: 0,
          tax: 0,
          hsn: 441122 // Default HSN code, should be product-specific
        })),
        payment_method: this.mapPaymentMethod(orderData.paymentMethod),
        sub_total: orderData.subtotal,
        length: 10, // Default dimensions - should be calculated based on products
        breadth: 10,
        height: 10,
        weight: this.calculateWeight(orderData.items)
      };

      const response = await axios.post(`${this.baseURL}/orders/create/adhoc`, shiprocketOrder, { headers });
      
      return response.data;
    } catch (error) {
      console.error('Create order error:', error.response?.data || error.message);
      throw new Error('Failed to create order in Shiprocket');
    }
  }

  // Track order
  async trackOrder(shipmentId) {
    try {
      const headers = await this.getHeaders();
      
      const response = await axios.get(`${this.baseURL}/courier/track/shipment/${shipmentId}`, {
        headers
      });

      return response.data;
    } catch (error) {
      console.error('Track order error:', error.response?.data || error.message);
      throw new Error('Failed to track order');
    }
  }

  // Cancel order
  async cancelOrder(orderId) {
    try {
      const headers = await this.getHeaders();
      
      const response = await axios.post(`${this.baseURL}/orders/cancel`, {
        ids: [orderId]
      }, { headers });

      return response.data;
    } catch (error) {
      console.error('Cancel order error:', error.response?.data || error.message);
      throw new Error('Failed to cancel order');
    }
  }

  // Generate AWB (Air Waybill)
  async generateAWB(shipmentId, courierId) {
    try {
      const headers = await this.getHeaders();
      
      const response = await axios.post(`${this.baseURL}/courier/assign/awb`, {
        shipment_id: shipmentId,
        courier_id: courierId
      }, { headers });

      return response.data;
    } catch (error) {
      console.error('Generate AWB error:', error.response?.data || error.message);
      throw new Error('Failed to generate AWB');
    }
  }

  // Get pickup locations
  async getPickupLocations() {
    try {
      const headers = await this.getHeaders();
      
      const response = await axios.get(`${this.baseURL}/settings/company/pickup`, {
        headers
      });

      return response.data;
    } catch (error) {
      console.error('Get pickup locations error:', error.response?.data || error.message);
      throw new Error('Failed to get pickup locations');
    }
  }

  // Helper methods
  mapPaymentMethod(paymentMethod) {
    const methodMap = {
      'credit_card': 'Prepaid',
      'debit_card': 'Prepaid',
      'paypal': 'Prepaid',
      'stripe': 'Prepaid',
      'cash_on_delivery': 'COD'
    };
    return methodMap[paymentMethod] || 'COD';
  }

  calculateWeight(items) {
    // Default weight calculation - should be based on actual product weights
    return items.reduce((total, item) => total + (item.quantity * 0.5), 0); // 0.5kg per item default
  }

  // Webhook verification
  verifyWebhook(payload, signature) {
    // Implement webhook signature verification if Shiprocket provides it
    // For now, return true
    return true;
  }

  // =======================================
  // SHIPROCKET CHECKOUT API METHODS
  // =======================================

  /**
   * Send product update webhook to Shiprocket
   * Called when product is created/updated in your system
   */
  async sendProductWebhook(product) {
    try {
      const checkoutApiUrl = process.env.SHIPROCKET_CHECKOUT_API_URL || 'https://checkout-api.shiprocket.com';
      const apiKey = process.env.SHIPROCKET_CHECKOUT_API_KEY;
      const secretKey = process.env.SHIPROCKET_CHECKOUT_SECRET_KEY;

      if (!apiKey || !secretKey) {
        console.warn('Shiprocket Checkout credentials not configured');
        return { success: false, message: 'Credentials not configured' };
      }

      const payload = this.formatProductWebhookPayload(product);
      const hmac = this.calculateHMAC(JSON.stringify(payload), secretKey);

      const response = await axios.post(
        `${checkoutApiUrl}/wh/v1/custom/product`,
        payload,
        {
          headers: {
            'X-Api-Key': apiKey,
            'X-Api-HMAC-SHA256': hmac,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Product webhook sent to Shiprocket:', response.status);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Send product webhook error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send collection update webhook to Shiprocket
   */
  async sendCollectionWebhook(collection) {
    try {
      const checkoutApiUrl = process.env.SHIPROCKET_CHECKOUT_API_URL || 'https://checkout-api.shiprocket.com';
      const apiKey = process.env.SHIPROCKET_CHECKOUT_API_KEY;
      const secretKey = process.env.SHIPROCKET_CHECKOUT_SECRET_KEY;

      if (!apiKey || !secretKey) {
        console.warn('Shiprocket Checkout credentials not configured');
        return { success: false, message: 'Credentials not configured' };
      }

      const payload = {
        id: collection._id ? collection._id.toString() : collection.id,
        updated_at: new Date(collection.updatedAt || Date.now()).toISOString(),
        title: collection.name || collection.title,
        body_html: collection.description || '',
        image: {
          src: collection.image || ''
        }
      };

      const hmac = this.calculateHMAC(JSON.stringify(payload), secretKey);

      const response = await axios.post(
        `${checkoutApiUrl}/wh/v1/custom/collection`,
        payload,
        {
          headers: {
            'X-Api-Key': apiKey,
            'X-Api-HMAC-SHA256': hmac,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Collection webhook sent to Shiprocket:', response.status);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Send collection webhook error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Helper method to calculate HMAC
  calculateHMAC(payload, secretKey) {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('base64');
  }

  // Helper method to format product for webhook
  formatProductWebhookPayload(product) {
    const productObj = product.toObject ? product.toObject() : product;
    
    return {
      id: productObj._id ? productObj._id.toString() : productObj.id,
      title: productObj.name,
      body_html: productObj.description || '',
      vendor: productObj.brand || '',
      product_type: productObj.category || '',
      updated_at: new Date(productObj.updatedAt).toISOString(),
      status: productObj.status || 'active',
      variants: (productObj.variants || []).map((variant, index) => ({
        id: variant._id ? variant._id.toString() : `${productObj._id}-${index}`,
        title: variant.color || `Variant ${index + 1}`,
        price: productObj.price.toString(),
        quantity: variant.totalStock || 0,
        sku: `${productObj.sku}-${variant.color}`,
        updated_at: new Date(productObj.updatedAt).toISOString(),
        image: {
          src: variant.images?.[0] || ''
        },
        weight: 0.5
      })),
      image: {
        src: productObj.variants?.[0]?.images?.[0] || ''
      }
    };
  }
}

module.exports = new ShiprocketService();