const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;

// ==========================================
// MIDDLEWARE
// ==========================================

const allowedOrigins = [
  "https://sanurpickle.netlify.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without origin and allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ==========================================
// IN-MEMORY DATA
// ==========================================

let products = [
  {
    id: 1,
    name: "Chicken Pickle",
    price: 250,
    stock: 50,
    image_url: "chicken",
  },
  {
    id: 2,
    name: "Mutton Pickle",
    price: 350,
    stock: 40,
    image_url: "mutton",
  },
  {
    id: 3,
    name: "Beef Pickle",
    price: 300,
    stock: 30,
    image_url: "beef",
  },
];

let orders = [];

let nextProductId = 4;
let nextOrderId = 1;

// ==========================================
// HOME / HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SANUR Pickles Backend is running",
  });
});

// ==========================================
// GET ALL PRODUCTS
// ==========================================

app.get("/api/products", (req, res) => {
  res.json({
    success: true,
    products,
  });
});

// ==========================================
// CREATE PRODUCT
// ==========================================

app.post("/api/products", (req, res) => {
  const { name, price, stock, image_url } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Product name is required",
    });
  }

  if (!price || Number(price) <= 0) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid price",
    });
  }

  const newProduct = {
    id: nextProductId++,
    name: name.trim(),
    price: Number(price),
    stock: Number(stock) || 0,
    image_url: image_url?.trim().toLowerCase() || "chicken",
  };

  products.push(newProduct);

  res.status(201).json({
    success: true,
    message: "Product added successfully",
    product: newProduct,
  });
});

// ==========================================
// UPDATE PRODUCT
// ==========================================

app.put("/api/products/:id", (req, res) => {
  const productId = Number(req.params.id);
  const { name, price, stock, image_url } = req.body;

  const productIndex = products.findIndex(
    (product) => product.id === productId
  );

  if (productIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Product name is required",
    });
  }

  if (!price || Number(price) <= 0) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid price",
    });
  }

  products[productIndex] = {
    ...products[productIndex],
    name: name.trim(),
    price: Number(price),
    stock: Number(stock) || 0,
    image_url:
      image_url?.trim().toLowerCase() ||
      products[productIndex].image_url,
  };

  res.json({
    success: true,
    message: "Product updated successfully",
    product: products[productIndex],
  });
});

// ==========================================
// DELETE PRODUCT
// ==========================================

app.delete("/api/products/:id", (req, res) => {
  const productId = Number(req.params.id);

  const productIndex = products.findIndex(
    (product) => product.id === productId
  );

  if (productIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  products.splice(productIndex, 1);

  res.json({
    success: true,
    message: "Product deleted successfully",
  });
});

// ==========================================
// CREATE ORDER
// ==========================================

app.post("/api/orders", (req, res) => {
  const { customer, items } = req.body;

  if (
    !customer ||
    !customer.name?.trim() ||
    !customer.phone?.trim() ||
    !customer.address?.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Name, phone and address are required",
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Cart is empty",
    });
  }

  const orderItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const productId = Number(item.id);
    const quantity = Number(item.quantity);

    const product = products.find(
      (product) => product.id === productId
    );

    if (!product) {
      return res.status(400).json({
        success: false,
        message: `Product not found: ${productId}`,
      });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quantity",
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `${product.name} does not have enough stock`,
      });
    }

    const subtotal = Number(product.price) * quantity;

    orderItems.push({
      id: `${nextOrderId}-${productId}`,
      productId: product.id,
      product_name: product.name,
      productName: product.name,
      price: Number(product.price),
      quantity,
      subtotal,
    });

    totalAmount += subtotal;
  }

  // Reduce stock
  for (const item of orderItems) {
    const product = products.find(
      (product) => product.id === item.productId
    );

    if (product) {
      product.stock -= item.quantity;
    }
  }

  const orderId = nextOrderId++;

  const newOrder = {
    id: orderId,
    order_number: `SANUR-${Date.now()}`,
    customer_name: customer.name.trim(),
    phone: customer.phone.trim(),
    address: customer.address.trim(),
    payment_method: "Cash on Delivery",
    payment_status: "Pending",
    order_status: "Placed",
    total_amount: Number(totalAmount.toFixed(2)),
    items: orderItems,
    created_at: new Date().toISOString(),
  };

  orders.unshift(newOrder);

  res.status(201).json({
    success: true,
    message: "Order placed successfully",
    order: {
      ...newOrder,
      customer: {
        name: newOrder.customer_name,
        phone: newOrder.phone,
        address: newOrder.address,
      },
    },
  });
});

// ==========================================
// GET ALL ORDERS
// ==========================================

app.get("/api/orders", (req, res) => {
  res.json({
    success: true,
    orders,
  });
});

// ==========================================
// GET ORDERS BY PHONE
// ==========================================

app.get("/api/orders/customer/:phone", (req, res) => {
  const phone = req.params.phone.trim();

  const customerOrders = orders.filter(
    (order) => order.phone === phone
  );

  res.json({
    success: true,
    orders: customerOrders,
  });
});

// ==========================================
// UPDATE ORDER STATUS
// ==========================================

app.put("/api/orders/:id/status", (req, res) => {
  const orderId = Number(req.params.id);
  const { order_status } = req.body;

  const allowedStatuses = [
    "Placed",
    "Confirmed",
    "Processing",
    "Shipped",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
  ];

  if (!allowedStatuses.includes(order_status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status",
    });
  }

  const order = orders.find(
    (order) => order.id === orderId
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  order.order_status = order_status;

  res.json({
    success: true,
    message: "Order status updated successfully",
    order,
  });
});

// ==========================================
// 404
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`,
  });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SANUR backend running on port ${PORT}`);
});