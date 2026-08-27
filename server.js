const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
  cors({
    origin: [
      "https://sanurpickle.netlify.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ==========================================
// IN-MEMORY DATA (No Database)
// ==========================================

let products = [
  {
    id: 1,
    name: "Chicken Pickle",
    price: 250,
    stock: 50,
    image_url: "chicken",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Mutton Pickle",
    price: 350,
    stock: 40,
    image_url: "mutton",
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: "Beef Pickle",
    price: 300,
    stock: 30,
    image_url: "beef",
    created_at: new Date().toISOString(),
  },
];

let orders = [];
let nextProductId = 4;
let nextOrderId = 1;

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SANUR Pickles Backend API is running (No Database)",
  });
});

// ==========================================
// GET ALL PRODUCTS
// ==========================================

app.get("/api/products", (req, res) => {
  res.status(200).json({
    success: true,
    products: products,
  });
});

// ==========================================
// GET SINGLE PRODUCT
// ==========================================

app.get("/api/products/:id", (req, res) => {
  const productId = Number(req.params.id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  const product = products.find((p) => p.id === productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  res.json({
    success: true,
    product: product,
  });
});

// ==========================================
// CREATE PRODUCT
// ==========================================

app.post("/api/products", (req, res) => {
  const { name, price, stock, image_url } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Product name is required",
    });
  }

  if (price === undefined || price === null || Number.isNaN(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid price",
    });
  }

  const newProduct = {
    id: nextProductId++,
    name: name.trim(),
    price: Number(price),
    stock: Number(stock || 0),
    image_url: image_url?.trim() || null,
    created_at: new Date().toISOString(),
  };

  products.push(newProduct);

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    product: newProduct,
  });
});

// ==========================================
// UPDATE PRODUCT
// ==========================================

app.put("/api/products/:id", (req, res) => {
  const productId = Number(req.params.id);
  const { name, price, stock, image_url } = req.body;

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  const productIndex = products.findIndex((p) => p.id === productId);

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

  if (price === undefined || price === null || Number.isNaN(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid price",
    });
  }

  products[productIndex] = {
    ...products[productIndex],
    name: name.trim(),
    price: Number(price),
    stock: Number(stock || 0),
    image_url: image_url?.trim() || null,
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

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  // Check if product exists in any order
  const isInOrder = orders.some((order) =>
    order.items.some((item) => item.productId === productId)
  );

  if (isInOrder) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete this product because it exists in previous orders.",
    });
  }

  const productIndex = products.findIndex((p) => p.id === productId);

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

  if (!customer) {
    return res.status(400).json({
      success: false,
      message: "Customer details are required",
    });
  }

  const customerName = (customer.name || "").trim();
  const customerPhone = (customer.phone || "").trim();
  const customerAddress = (customer.address || "").trim();

  if (!customerName || !customerPhone || !customerAddress) {
    return res.status(400).json({
      success: false,
      message: "Name, phone and address are required",
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Order must contain at least one product",
    });
  }

  const orderItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const productId = Number(item.id);
    const quantity = Number(item.quantity);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product quantity",
      });
    }

    const product = products.find((p) => p.id === productId);

    if (!product) {
      return res.status(400).json({
        success: false,
        message: `Product ID ${productId} not found`,
      });
    }

    const price = Number(product.price);
    const subtotal = price * quantity;

    totalAmount += subtotal;

    orderItems.push({
      productId,
      productName: product.name,
      price,
      quantity,
      subtotal,
    });
  }

  const orderNumber = `SANUR-${Date.now()}`;
  const orderId = nextOrderId++;

  const newOrder = {
    id: orderId,
    order_number: orderNumber,
    customer_name: customerName,
    phone: customerPhone,
    address: customerAddress,
    payment_method: "Cash on Delivery",
    payment_status: "Pending",
    order_status: "Placed",
    total_amount: Number(totalAmount.toFixed(2)),
    items: orderItems,
    created_at: new Date().toISOString(),
  };

  orders.push(newOrder);

  res.status(201).json({
    success: true,
    message: "Order placed successfully",
    order: {
      id: orderId,
      order_number: orderNumber,
      customer: {
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
      },
      items: orderItems,
      payment_method: "Cash on Delivery",
      payment_status: "Pending",
      order_status: "Placed",
      total_amount: Number(totalAmount.toFixed(2)),
    },
  });
});

// ==========================================
// GET ALL ORDERS
// ==========================================

app.get("/api/orders", (req, res) => {
  res.json({
    success: true,
    orders: orders,
  });
});

// ==========================================
// GET CUSTOMER ORDERS BY PHONE
// ==========================================

app.get("/api/orders/customer/:phone", (req, res) => {
  const phone = req.params.phone.trim();

  const customerOrders = orders.filter((order) => order.phone === phone);

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

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID",
    });
  }

  if (!allowedStatuses.includes(order_status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status",
    });
  }

  const orderIndex = orders.findIndex((o) => o.id === orderId);

  if (orderIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  orders[orderIndex].order_status = order_status;

  res.json({
    success: true,
    message: "Order status updated successfully",
  });
});

// ==========================================
// 404
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.url}`,
  });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log("================================");
  console.log("SANUR Pickles Backend Running (No Database)");
  console.log(`Port: ${PORT}`);
  console.log("================================");
});