# Website API Documentation

This document describes the API endpoints for the ecommerce website frontend.

## Base URL
```
http://localhost:5000/api/website
```

## Authentication
The website uses JWT tokens for customer authentication. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Public Endpoints (No Authentication Required)

### Products

#### Get All Products
```http
GET /api/website/products
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 12)
- `category` (string): Filter by category
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `sortBy` (string): Sort field (default: "createdAt")
- `sortOrder` (string): "asc" or "desc" (default: "desc")
- `search` (string): Search in name, description, category

**Response:**
```json
{
  "products": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalProducts": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### Get Featured Products
```http
GET /api/website/products/featured
```

**Query Parameters:**
- `limit` (number): Number of products (default: 8)

#### Get Products by Category
```http
GET /api/website/products/category/:category
```

#### Search Products
```http
GET /api/website/products/search?q=searchterm
```

#### Get Single Product
```http
GET /api/website/product/:id
```

**Response:**
```json
{
  "product": {...},
  "relatedProducts": [...]
}
```

### Contact & Newsletter

#### Submit Contact Form
```http
POST /api/website/contact
```

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "subject": "Inquiry",
  "message": "Your message here"
}
```

#### Subscribe to Newsletter
```http
POST /api/website/newsletter/subscribe
```

**Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Unsubscribe from Newsletter
```http
POST /api/website/newsletter/unsubscribe
```

**Body:**
```json
{
  "email": "user@example.com"
}
```

---

## Customer Authentication

#### Register Customer
```http
POST /api/website/auth/register
```

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890"
}
```

**Response:**
```json
{
  "message": "Customer registered successfully",
  "customer": {...},
  "token": "jwt_token",
  "refreshToken": "refresh_token"
}
```

#### Login Customer
```http
POST /api/website/auth/login
```

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Refresh Token
```http
POST /api/website/auth/refresh-token
```

**Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

---

## Protected Endpoints (Authentication Required)

### Customer Profile

#### Get Profile
```http
GET /api/website/auth/profile
```

#### Update Profile
```http
PUT /api/website/auth/profile
```

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "1234567890",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "addresses": [
    {
      "type": "home",
      "street": "123 Main St",
      "city": "City",
      "state": "State",
      "zipCode": "12345",
      "country": "Country",
      "isDefault": true
    }
  ]
}
```

#### Logout
```http
POST /api/website/auth/logout
```

### Shopping Cart

#### Add to Cart
```http
POST /api/website/cart/add
```

**Body:**
```json
{
  "productId": "product_id",
  "quantity": 2,
  "size": "M",
  "color": "Red"
}
```

#### Get Cart
```http
GET /api/website/cart
```

#### Update Cart Item
```http
PUT /api/website/cart/item/:itemId
```

**Body:**
```json
{
  "quantity": 3
}
```

#### Remove from Cart
```http
DELETE /api/website/cart/item/:itemId
```

#### Clear Cart
```http
DELETE /api/website/cart/clear
```

### Wishlist

#### Add to Wishlist
```http
POST /api/website/wishlist/add
```

**Body:**
```json
{
  "productId": "product_id"
}
```

#### Get Wishlist
```http
GET /api/website/wishlist
```

#### Remove from Wishlist
```http
DELETE /api/website/wishlist/item/:itemId
```

#### Clear Wishlist
```http
DELETE /api/website/wishlist/clear
```

#### Move to Cart
```http
POST /api/website/wishlist/move-to-cart/:itemId
```

**Body:**
```json
{
  "quantity": 1,
  "size": "M",
  "color": "Red"
}
```

### Orders

#### Create Order
```http
POST /api/website/orders
```

**Body:**
```json
{
  "items": [
    {
      "productId": "product_id",
      "quantity": 2,
      "size": "M",
      "color": "Red"
    }
  ],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "street": "123 Main St",
    "city": "City",
    "state": "State",
    "zipCode": "12345",
    "country": "Country"
  },
  "billingAddress": {...},
  "paymentMethod": "credit_card",
  "notes": "Special instructions"
}
```

#### Get Customer Orders
```http
GET /api/website/orders
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by order status

#### Get Single Order
```http
GET /api/website/orders/:orderId
```

#### Cancel Order
```http
PUT /api/website/orders/:orderId/cancel
```

**Body:**
```json
{
  "cancellationReason": "Changed my mind"
}
```

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "error": "Error message"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Server Error

---

## Testing

Run the test script to verify all endpoints:
```bash
node test-website-api.js
```

Make sure your server is running on port 5000 before running tests.