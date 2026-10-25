
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const db = require("./database");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Serve images from backend/images
app.use("/images", express.static(path.join(__dirname, "images")));

// Health check
app.get("/api/health", (req, res) => {
  try {
    db.prepare("SELECT 1").get();

    res.json({
      success: true,
      message: "Backend and database are working!",
    });
  } catch (error) {
    console.error("Health check error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database is not available.",
    });
  }
});

// Admin login
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body || {};

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return res.status(500).json({
      success: false,
      message: "Admin credentials are not configured in backend/.env.",
    });
  }

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.trim().toLowerCase() !== adminEmail.trim().toLowerCase() ||
    password !== adminPassword
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid admin email or password.",
    });
  }

  // This validates credentials only; it does not create a login session.
  return res.json({
    success: true,
    message: "Admin credentials verified.",
  });
});

// Get all sweets
app.get("/api/sweets", (req, res) => {
  try {
    const sweets = db
      .prepare("SELECT * FROM sweets ORDER BY id DESC")
      .all();

    res.json({
      success: true,
      data: sweets,
    });
  } catch (error) {
    console.error("Get sweets error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load sweets.",
    });
  }
});

// Add a sweet
app.post("/api/sweets", (req, res) => {
  try {
    const {
      name,
      price,
      description = "",
      image = "",
    } = req.body || {};

    const numericPrice = Number(price);

    if (
      typeof name !== "string" ||
      !name.trim() ||
      price === undefined ||
      price === null ||
      price === "" ||
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid sweet name and price.",
      });
    }

    const result = db
      .prepare(`
        INSERT INTO sweets (name, price, description, image)
        VALUES (?, ?, ?, ?)
      `)
      .run(
        name.trim(),
        numericPrice,
        String(description),
        String(image)
      );

    const sweet = db
      .prepare("SELECT * FROM sweets WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Sweet added successfully.",
      data: sweet,
    });
  } catch (error) {
    console.error("Add sweet error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to add sweet.",
    });
  }
});

// Update a sweet
app.put("/api/sweets/:id", (req, res) => {
  try {
    const {
      name,
      price,
      description = "",
      image = "",
    } = req.body || {};

    const numericPrice = Number(price);
    const id = Number(req.params.id);

    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      typeof name !== "string" ||
      !name.trim() ||
      price === undefined ||
      price === null ||
      price === "" ||
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid sweet ID, name and price.",
      });
    }

    const result = db
      .prepare(`
        UPDATE sweets
        SET name = ?, price = ?, description = ?, image = ?
        WHERE id = ?
      `)
      .run(
        name.trim(),
        numericPrice,
        String(description),
        String(image),
        id
      );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Sweet not found.",
      });
    }

    const sweet = db
      .prepare("SELECT * FROM sweets WHERE id = ?")
      .get(id);

    res.json({
      success: true,
      message: "Sweet updated successfully.",
      data: sweet,
    });
  } catch (error) {
    console.error("Update sweet error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to update sweet.",
    });
  }
});

// Delete a sweet
app.delete("/api/sweets/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid sweet ID.",
      });
    }

    const result = db
      .prepare("DELETE FROM sweets WHERE id = ?")
      .run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Sweet not found.",
      });
    }

    res.json({
      success: true,
      message: "Sweet deleted successfully.",
    });
  } catch (error) {
    console.error("Delete sweet error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to delete sweet.",
    });
  }
});

// Create an order
app.post("/api/orders", (req, res) => {
  try {
    const {
      customer_name,
      phone,
      address,
      items,
      total,
    } = req.body || {};

    const numericTotal = Number(total);

    if (
      typeof customer_name !== "string" ||
      !customer_name.trim() ||
      !/^[0-9]{10}$/.test(String(phone || "")) ||
      typeof address !== "string" ||
      !address.trim() ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !Number.isFinite(numericTotal) ||
      numericTotal <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid order details.",
      });
    }

    for (const item of items) {
      if (
        !item ||
        !Number.isSafeInteger(Number(item.id)) ||
        Number(item.id) <= 0 ||
        !Number.isSafeInteger(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Order contains an invalid sweet or quantity.",
        });
      }
    }

    // Recalculate prices from the database instead of trusting client prices.
    const getSweet = db.prepare(
      "SELECT id, name, price FROM sweets WHERE id = ?"
    );

    const verifiedItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const sweet = getSweet.get(Number(item.id));

      if (!sweet) {
        return res.status(400).json({
          success: false,
          message: `Sweet ID ${item.id} was not found.`,
        });
      }

      const quantity = Number(item.quantity);

      verifiedItems.push({
        id: sweet.id,
        name: sweet.name,
        price: Number(sweet.price),
        quantity,
      });

      calculatedTotal += Number(sweet.price) * quantity;
    }

    if (Math.abs(calculatedTotal - numericTotal) > 0.01) {
      return res.status(400).json({
        success: false,
        message: "Order total does not match current sweet prices.",
        expectedTotal: calculatedTotal,
      });
    }

    const result = db
      .prepare(`
        INSERT INTO orders
          (customer_name, phone, address, items, total)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        customer_name.trim(),
        String(phone),
        address.trim(),
        JSON.stringify(verifiedItems),
        calculatedTotal
      );

    res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      orderId: Number(result.lastInsertRowid),
    });
  } catch (error) {
    console.error("Create order error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to place order.",
    });
  }
});

// Get all orders
app.get("/api/orders", (req, res) => {
  try {
    const orders = db
      .prepare("SELECT * FROM orders ORDER BY id DESC")
      .all();

    res.json({
      success: true,
      data: orders.map((order) => ({
        ...order,
        items: JSON.parse(order.items),
      })),
    });
  } catch (error) {
    console.error("Get orders error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to load orders.",
    });
  }
});

// Update order status
app.put("/api/orders/:id/status", (req, res) => {
  try {
    const allowedStatuses = [
      "Pending",
      "Preparing",
      "Delivered",
      "Cancelled",
    ];

    const id = Number(req.params.id);
    const { status } = req.body || {};

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID.",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status.",
      });
    }

    const result = db
      .prepare("UPDATE orders SET status = ? WHERE id = ?")
      .run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    res.json({
      success: true,
      message: "Order status updated successfully.",
    });
  } catch (error) {
    console.error("Update order status error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to update order status.",
    });
  }
});

// Unknown API route
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Unexpected server error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log("Sweet House database ready!");
  console.log(`Server running at http://localhost:${PORT}`);
});

server.on("error", (error) => {
  console.error("Server error:", error.message);
});
