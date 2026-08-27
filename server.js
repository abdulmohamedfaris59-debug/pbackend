const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(express.json());

// ==========================================
// DATABASE CONNECTION
// ==========================================

const pool = mysql.createPool({
  host:
    process.env.DB_HOST ||
    "localhost",

  port:
    Number(process.env.DB_PORT) ||
    3306,

  user:
    process.env.DB_USER ||
    "root",

  password:
    process.env.DB_PASSWORD ||
    "",

  database:
    process.env.DB_NAME ||
    "pickle_shop",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ==========================================
// TEST DATABASE
// ==========================================

async function testDatabaseConnection() {
  try {
    const connection =
      await pool.getConnection();

    console.log(
      "✅ MySQL connected successfully"
    );

    connection.release();
  } catch (error) {
    console.error(
      "❌ MySQL connection error:",
      error.message
    );
  }
}

testDatabaseConnection();

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "SANUR Pickles Backend API is running",
  });
});

// ==========================================
// GET ALL PRODUCTS
// NO STOCK
// ==========================================

app.get(
  "/api/products",
  async (req, res) => {
    try {
      const [products] =
        await pool.query(`
          SELECT
            id,
            name,
            price,
            image_url,
            created_at
          FROM products
          ORDER BY id ASC
        `);

      res.status(200).json({
        success: true,
        products,
      });
    } catch (error) {
      console.error(
        "Get products error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch products",
      });
    }
  }
);

// ==========================================
// GET SINGLE PRODUCT
// ==========================================

app.get(
  "/api/products/:id",
  async (req, res) => {
    try {
      const productId =
        Number(req.params.id);

      if (
        !Number.isInteger(productId) ||
        productId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID",
        });
      }

      const [products] =
        await pool.query(
          `
          SELECT
            id,
            name,
            price,
            image_url,
            created_at
          FROM products
          WHERE id = ?
          `,
          [productId]
        );

      if (products.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      res.json({
        success: true,
        product: products[0],
      });
    } catch (error) {
      console.error(
        "Get product error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch product",
      });
    }
  }
);

// ==========================================
// CREATE PRODUCT
// ==========================================

app.post(
  "/api/products",
  async (req, res) => {
    try {
      const {
        name,
        price,
        image_url,
      } = req.body;

      if (
        !name ||
        name.trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Product name is required",
        });
      }

      if (
        price === undefined ||
        price === null ||
        Number.isNaN(Number(price)) ||
        Number(price) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid price",
        });
      }

      const [result] =
        await pool.query(
          `
          INSERT INTO products (
            name,
            price,
            image_url
          )
          VALUES (?, ?, ?)
          `,
          [
            name.trim(),
            Number(price),
            image_url &&
            image_url.trim()
              ? image_url.trim()
              : null,
          ]
        );

      const [products] =
        await pool.query(
          `
          SELECT
            id,
            name,
            price,
            image_url,
            created_at
          FROM products
          WHERE id = ?
          `,
          [result.insertId]
        );

      res.status(201).json({
        success: true,
        message:
          "Product created successfully",
        product:
          products[0],
      });
    } catch (error) {
      console.error(
        "Create product error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to create product",
      });
    }
  }
);

// ==========================================
// UPDATE PRODUCT
// ==========================================

app.put(
  "/api/products/:id",
  async (req, res) => {
    try {
      const productId =
        Number(req.params.id);

      const {
        name,
        price,
        image_url,
      } = req.body;

      if (
        !Number.isInteger(productId) ||
        productId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID",
        });
      }

      if (
        !name ||
        !name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Product name is required",
        });
      }

      if (
        price === undefined ||
        price === null ||
        Number.isNaN(Number(price)) ||
        Number(price) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid price",
        });
      }

      const [existingProducts] =
        await pool.query(
          `
          SELECT id
          FROM products
          WHERE id = ?
          `,
          [productId]
        );

      if (
        existingProducts.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      await pool.query(
        `
        UPDATE products
        SET
          name = ?,
          price = ?,
          image_url = ?
        WHERE id = ?
        `,
        [
          name.trim(),
          Number(price),
          image_url &&
          image_url.trim()
            ? image_url.trim()
            : null,
          productId,
        ]
      );

      const [updatedProducts] =
        await pool.query(
          `
          SELECT
            id,
            name,
            price,
            image_url,
            created_at
          FROM products
          WHERE id = ?
          `,
          [productId]
        );

      res.status(200).json({
        success: true,
        message:
          "Product updated successfully",
        product:
          updatedProducts[0],
      });
    } catch (error) {
      console.error(
        "Update product error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update product",
      });
    }
  }
);

// ==========================================
// DELETE PRODUCT
// ==========================================

app.delete(
  "/api/products/:id",
  async (req, res) => {
    try {
      const productId =
        Number(req.params.id);

      if (
        !Number.isInteger(productId) ||
        productId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID",
        });
      }

      const [existingProducts] =
        await pool.query(
          `
          SELECT id
          FROM products
          WHERE id = ?
          `,
          [productId]
        );

      if (
        existingProducts.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      const [orderItems] =
        await pool.query(
          `
          SELECT id
          FROM order_items
          WHERE product_id = ?
          LIMIT 1
          `,
          [productId]
        );

      if (
        orderItems.length > 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot delete this product because it exists in previous orders.",
        });
      }

      await pool.query(
        `
        DELETE FROM products
        WHERE id = ?
        `,
        [productId]
      );

      res.json({
        success: true,
        message:
          "Product deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete product error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to delete product",
      });
    }
  }
);

// ==========================================
// CREATE ORDER
// CASH ON DELIVERY ONLY
// ==========================================

app.post(
  "/api/orders",
  async (req, res) => {
    const connection =
      await pool.getConnection();

    try {
      const {
        customer,
        items,
      } = req.body;

      if (!customer) {
        return res.status(400).json({
          success: false,
          message:
            "Customer details are required",
        });
      }

      const customerName =
        (
          customer.name ||
          ""
        ).trim();

      const customerPhone =
        (
          customer.phone ||
          ""
        ).trim();

      const customerAddress =
        (
          customer.address ||
          ""
        ).trim();

      if (!customerName) {
        return res.status(400).json({
          success: false,
          message:
            "Customer name is required",
        });
      }

      if (!customerPhone) {
        return res.status(400).json({
          success: false,
          message:
            "Customer phone number is required",
        });
      }

      if (!customerAddress) {
        return res.status(400).json({
          success: false,
          message:
            "Customer address is required",
        });
      }

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Order must contain at least one product",
        });
      }

      await connection.beginTransaction();

      // ======================================
      // FIND OR CREATE CUSTOMER
      // ======================================

      let customerId;

      const [existingCustomers] =
        await connection.query(
          `
          SELECT id
          FROM customers
          WHERE phone = ?
          LIMIT 1
          `,
          [customerPhone]
        );

      if (
        existingCustomers.length > 0
      ) {
        customerId =
          existingCustomers[0].id;

        await connection.query(
          `
          UPDATE customers
          SET
            name = ?,
            address = ?
          WHERE id = ?
          `,
          [
            customerName,
            customerAddress,
            customerId,
          ]
        );
      } else {
        const [customerResult] =
          await connection.query(
            `
            INSERT INTO customers (
              name,
              phone,
              address
            )
            VALUES (?, ?, ?)
            `,
            [
              customerName,
              customerPhone,
              customerAddress,
            ]
          );

        customerId =
          customerResult.insertId;
      }

      // ======================================
      // PREPARE ORDER ITEMS
      // ======================================

      const orderItems = [];
      let totalAmount = 0;

      for (const item of items) {
        const productId =
          Number(item.id);

        const quantity =
          Number(item.quantity);

        if (
          !Number.isInteger(productId) ||
          productId <= 0
        ) {
          throw new Error(
            "Invalid product ID"
          );
        }

        if (
          !Number.isInteger(quantity) ||
          quantity <= 0
        ) {
          throw new Error(
            "Product quantity must be greater than zero"
          );
        }

        const [products] =
          await connection.query(
            `
            SELECT
              id,
              name,
              price
            FROM products
            WHERE id = ?
            `,
            [productId]
          );

        if (
          products.length === 0
        ) {
          throw new Error(
            `Product with ID ${productId} not found`
          );
        }

        const product =
          products[0];

        const price =
          Number(product.price);

        const subtotal =
          price * quantity;

        totalAmount +=
          subtotal;

        orderItems.push({
          productId,
          productName:
            product.name,
          price,
          quantity,
          subtotal,
        });
      }

      // ======================================
      // CREATE ORDER
      // CASH ON DELIVERY ONLY
      // ======================================

      const orderNumber =
        `SANUR-${Date.now()}`;

      const [orderResult] =
        await connection.query(
          `
          INSERT INTO orders (
            order_number,
            customer_name,
            phone,
            address,
            payment_method,
            payment_status,
            order_status,
            total_amount,
            customer_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            orderNumber,
            customerName,
            customerPhone,
            customerAddress,
            "Cash on Delivery",
            "Pending",
            "Placed",
            totalAmount.toFixed(2),
            customerId,
          ]
        );

      const orderId =
        orderResult.insertId;

      // ======================================
      // SAVE ORDER ITEMS
      // ======================================

      for (
        const item of orderItems
      ) {
        await connection.query(
          `
          INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            price,
            quantity,
            subtotal
          )
          VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            orderId,
            item.productId,
            item.productName,
            item.price,
            item.quantity,
            item.subtotal,
          ]
        );
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message:
          "Order placed successfully",
        order: {
          id: orderId,
          order_number:
            orderNumber,

          customer: {
            name:
              customerName,
            phone:
              customerPhone,
            address:
              customerAddress,
          },

          items:
            orderItems.map(
              (item) => ({
                productId:
                  item.productId,
                productName:
                  item.productName,
                price:
                  item.price,
                quantity:
                  item.quantity,
                subtotal:
                  item.subtotal,
              })
            ),

          payment_method:
            "Cash on Delivery",

          payment_status:
            "Pending",

          order_status:
            "Placed",

          total_amount:
            Number(
              totalAmount.toFixed(2)
            ),
        },
      });
    } catch (error) {
      await connection.rollback();

      console.error(
        "Create order error:",
        error
      );

      res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to place order",
      });
    } finally {
      connection.release();
    }
  }
);

// ==========================================
// GET ALL ORDERS
// ==========================================

app.get(
  "/api/orders",
  async (req, res) => {
    try {
      const [orders] =
        await pool.query(`
          SELECT
            id,
            order_number,
            customer_id,
            customer_name,
            phone,
            address,
            payment_method,
            payment_status,
            order_status,
            total_amount,
            created_at
          FROM orders
          ORDER BY id DESC
        `);

      const finalOrders = [];

      for (
        const order of orders
      ) {
        const [items] =
          await pool.query(
            `
            SELECT
              id,
              product_id,
              product_name,
              price,
              quantity,
              subtotal
            FROM order_items
            WHERE order_id = ?
            ORDER BY id ASC
            `,
            [order.id]
          );

        finalOrders.push({
          ...order,
          items,
        });
      }

      res.json({
        success: true,
        orders:
          finalOrders,
      });
    } catch (error) {
      console.error(
        "Get orders error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to fetch orders",
      });
    }
  }
);

// ==========================================
// GET CUSTOMER ORDERS BY PHONE
// ==========================================

app.get(
  "/api/orders/customer/:phone",
  async (req, res) => {
    try {
      const phone =
        req.params.phone.trim();

      const [orders] =
        await pool.query(
          `
          SELECT
            id,
            order_number,
            customer_name,
            phone,
            address,
            payment_method,
            payment_status,
            order_status,
            total_amount,
            created_at
          FROM orders
          WHERE phone = ?
          ORDER BY id DESC
          `,
          [phone]
        );

      const finalOrders = [];

      for (
        const order of orders
      ) {
        const [items] =
          await pool.query(
            `
            SELECT
              id,
              product_id,
              product_name,
              price,
              quantity,
              subtotal
            FROM order_items
            WHERE order_id = ?
            ORDER BY id ASC
            `,
            [order.id]
          );

        finalOrders.push({
          ...order,
          items,
        });
      }

      res.json({
        success: true,
        orders:
          finalOrders,
      });
    } catch (error) {
      console.error(
        "Customer orders error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to load customer orders",
      });
    }
  }
);

// ==========================================
// UPDATE ORDER STATUS
// ==========================================

app.put(
  "/api/orders/:id/status",
  async (req, res) => {
    try {
      const orderId =
        Number(req.params.id);

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
        !Number.isInteger(orderId) ||
        orderId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

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

      const [result] =
        await pool.query(
          `
          UPDATE orders
          SET order_status = ?
          WHERE id = ?
          `,
          [
            order_status,
            orderId,
          ]
        );

      if (
        result.affectedRows === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      res.json({
        success: true,
        message:
          "Order status updated successfully",
      });
    } catch (error) {
      console.error(
        "Update order status error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to update order status",
      });
    }
  }
);

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
  console.log(
    `Route not found: ${req.method} ${req.url}`
  );

  res.status(404).json({
    success: false,
    message:
      `API route not found: ${req.method} ${req.url}`,
  });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log("");
  console.log(
    "================================"
  );
  console.log(
    "SANUR Pickles Backend Running"
  );
  console.log(
    `Server: http://localhost:${PORT}`
  );
  console.log(
    "================================"
  );
});