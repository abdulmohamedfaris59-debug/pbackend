const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;

// ==========================================
// ALLOWED ORIGINS
// ==========================================

const allowedOrigins = [
  "https://sanurpickle.netlify.app",
  "https://www.sanurpickle.netlify.app",
  "http://localhost:5173",
  "http://localhost:5174",
];

// ==========================================
// CORS MIDDLEWARE
// ==========================================

const corsOptions = {
  origin: (origin, callback) => {
    // Allow Postman, Render health checks and requests without Origin
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("Blocked by CORS:", origin);

    return callback(null, false);
  },

  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  credentials: false,
};

app.use(cors(corsOptions));

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json());

// Request logger - useful in Render logs
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.url}`
  );
  next();
});

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
// HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SANUR Pickles Backend is running",
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SANUR API is running",
  });
});

// ==========================================
// GET ALL PRODUCTS
// ==========================================

app.get("/api/products", (req, res) => {
  res.status(200).json({
    success: true,
    products,
  });
});

// ==========================================
// CREATE PRODUCT
// ==========================================

app.post("/api/products", (req, res) => {
  try {
    const {
      name,
      price,
      stock,
      image_url,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (
      price === undefined ||
      price === null ||
      Number(price) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid price",
      });
    }

    const newProduct = {
      id: nextProductId++,
      name: String(name).trim(),
      price: Number(price),
      stock: Math.max(
        0,
        Number(stock) || 0
      ),
      image_url: String(
        image_url || "chicken"
      )
        .trim()
        .toLowerCase(),
    };

    products.push(newProduct);

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      product: newProduct,
    });
  } catch (error) {
    console.error(
      "Add product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to add product",
    });
  }
});

// ==========================================
// UPDATE PRODUCT
// ==========================================

app.put("/api/products/:id", (req, res) => {
  try {
    const productId = Number(
      req.params.id
    );

    const {
      name,
      price,
      stock,
      image_url,
    } = req.body;

    const product = products.find(
      (item) => item.id === productId
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (
      price === undefined ||
      price === null ||
      Number(price) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid price",
      });
    }

    product.name = String(name).trim();
    product.price = Number(price);

    product.stock = Math.max(
      0,
      Number(stock) || 0
    );

    product.image_url = String(
      image_url || product.image_url
    )
      .trim()
      .toLowerCase();

    return res.status(200).json({
      success: true,
      message:
        "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error(
      "Update product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
});

// ==========================================
// DELETE PRODUCT
// ==========================================

app.delete("/api/products/:id", (req, res) => {
  try {
    const productId = Number(
      req.params.id
    );

    const productIndex =
      products.findIndex(
        (item) => item.id === productId
      );

    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    products.splice(productIndex, 1);

    return res.status(200).json({
      success: true,
      message:
        "Product deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete product",
    });
  }
});

// ==========================================
// CREATE ORDER
// ==========================================

app.post("/api/orders", (req, res) => {
  try {
    const {
      customer,
      items,
    } = req.body;

    if (
      !customer ||
      !customer.name ||
      !customer.phone ||
      !customer.address ||
      !String(customer.name).trim() ||
      !String(customer.phone).trim() ||
      !String(customer.address).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, phone and address are required",
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const orderItems = [];
    let totalAmount = 0;

    // Validate every item first
    for (const item of items) {
      const productId = Number(item.id);
      const quantity = Number(
        item.quantity
      );

      const product = products.find(
        (productItem) =>
          productItem.id === productId
      );

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${productId}`,
        });
      }

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
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

      const subtotal =
        Number(product.price) * quantity;

      orderItems.push({
        productId: product.id,
        product_name: product.name,
        productName: product.name,
        price: Number(product.price),
        quantity,
        subtotal: Number(
          subtotal.toFixed(2)
        ),
      });

      totalAmount += subtotal;
    }

    // Reduce stock after all validation succeeds
    for (const item of orderItems) {
      const product = products.find(
        (productItem) =>
          productItem.id === item.productId
      );

      if (product) {
        product.stock -= item.quantity;
      }
    }

    const orderId = nextOrderId++;

    const newOrder = {
      id: orderId,

      order_number:
        `SANUR-${Date.now()}`,

      customer_name:
        String(customer.name).trim(),

      phone:
        String(customer.phone).trim(),

      address:
        String(customer.address).trim(),

      payment_method:
        "Cash on Delivery",

      payment_status:
        "Pending",

      order_status:
        "Placed",

      total_amount: Number(
        totalAmount.toFixed(2)
      ),

      items: orderItems,

      created_at:
        new Date().toISOString(),
    };

    orders.unshift(newOrder);

    return res.status(201).json({
      success: true,
      message:
        "Order placed successfully",

      order: {
        ...newOrder,

        customer: {
          name:
            newOrder.customer_name,

          phone:
            newOrder.phone,

          address:
            newOrder.address,
        },
      },
    });
  } catch (error) {
    console.error(
      "Create order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to place order",
    });
  }
});

// ==========================================
// GET ALL ORDERS
// ==========================================

app.get("/api/orders", (req, res) => {
  return res.status(200).json({
    success: true,
    orders,
  });
});

// ==========================================
// GET CUSTOMER ORDERS
// ==========================================

app.get(
  "/api/orders/customer/:phone",
  (req, res) => {
    const phone = String(
      req.params.phone
    ).trim();

    const customerOrders =
      orders.filter(
        (order) =>
          order.phone === phone
      );

    return res.status(200).json({
      success: true,
      orders: customerOrders,
    });
  }
);

// ==========================================
// UPDATE ORDER STATUS
// ==========================================

app.put(
  "/api/orders/:id/status",
  (req, res) => {
    try {
      const orderId = Number(
        req.params.id
      );

      const {
        order_status,
      } = req.body;

      const allowedStatuses = [
        "Placed",
        "Confirmed",
        "Processing",
        "Shipped",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ];

      if (
        !allowedStatuses.includes(
          order_status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order status",
        });
      }

      const order = orders.find(
        (item) =>
          item.id === orderId
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      order.order_status =
        order_status;

      return res.status(200).json({
        success: true,
        message:
          "Order status updated successfully",
        order,
      });
    } catch (error) {
      console.error(
        "Update order status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update status",
      });
    }
  }
);

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==========================================
// ERROR HANDLER
// ==========================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Server error:",
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Internal server error",
    });
  }
);

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `SANUR backend running on port ${PORT}`
  );

  console.log(
    `Products API: http://localhost:${PORT}/api/products`
  );
});