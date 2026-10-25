
import { useCallback, useEffect, useMemo, useState } from "react";
import BillReceipt from "./BillReceipt";
import "./Admin.css";

const API = "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Something went wrong.");
  }

  return result;
}

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(amount) || 0);

function getItems(order) {
  try {
    const items =
      typeof order.items === "string"
        ? JSON.parse(order.items || "[]")
        : order.items || [];

    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function getOrderTotal(order) {
  if (order.total !== undefined && order.total !== null) {
    return Number(order.total) || 0;
  }

  return getItems(order).reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
}

export default function Admin() {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });

  const [loggedIn, setLoggedIn] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = await request("/orders");
      const data = Array.isArray(result)
        ? result
        : result.data || result.orders || [];

      setOrders(data);
    } catch (error) {
      setMessage(error.message || "Orders load झाले नाहीत.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginLoading(true);
    setMessage("");

    try {
      await request("/admin/login", {
        method: "POST",
        body: JSON.stringify({
          username: credentials.username.trim(),
          password: credentials.password,
        }),
      });

      setLoggedIn(true);
      setCredentials({ username: "", password: "" });
    } catch (error) {
      setMessage(error.message || "Login अयशस्वी झाला.");
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn) {
      loadOrders();
    }
  }, [loggedIn, loadOrders]);

  const updateStatus = async (order, status) => {
    setUpdatingOrderId(order.id);
    setMessage("");

    try {
      await request(`/orders/${order.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });

      setOrders((previousOrders) =>
        previousOrders.map((item) =>
          item.id === order.id ? { ...item, status } : item
        )
      );

      setSelectedBill((current) =>
        current?.id === order.id ? { ...current, status } : current
      );

      setMessage(`Order #${order.id} status updated.`);
    } catch (error) {
      setMessage(error.message || "Status update झाला नाही.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const logout = () => {
    setLoggedIn(false);
    setOrders([]);
    setSelectedBill(null);
    setFilter("All");
    setSearch("");
    setMessage("");
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = String(order.status || "Pending");
      const matchesFilter =
        filter === "All" || status.toLowerCase() === filter.toLowerCase();

      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        String(order.id ?? "").toLowerCase().includes(query) ||
        String(order.customer_name || order.name || "")
          .toLowerCase()
          .includes(query) ||
        String(order.phone || "").toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [orders, filter, search]);

  const stats = useMemo(() => {
    const totalSales = orders.reduce(
      (sum, order) => sum + getOrderTotal(order),
      0
    );

    const pending = orders.filter(
      (order) => String(order.status || "Pending").toLowerCase() === "pending"
    ).length;

    const delivered = orders.filter(
      (order) => String(order.status || "").toLowerCase() === "delivered"
    ).length;

    return {
      total: orders.length,
      pending,
      delivered,
      totalSales,
    };
  }, [orders]);

  if (!loggedIn) {
    return (
      <main className="admin-page">
        <section className="admin-login-card">
          <h1>Sweet House Admin</h1>
          <p>Login to manage customer orders.</p>

          {message && (
            <p className="admin-message" role="alert">
              {message}
            </p>
          )}

          <form onSubmit={handleLogin}>
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              type="text"
              autoComplete="username"
              value={credentials.username}
              onChange={(event) =>
                setCredentials((previous) => ({
                  ...previous,
                  username: event.target.value,
                }))
              }
              required
            />

            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={(event) =>
                setCredentials((previous) => ({
                  ...previous,
                  password: event.target.value,
                }))
              }
              required
            />

            <button type="submit" disabled={loginLoading}>
              {loginLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <h1>Sweet House Admin</h1>
          <p>Manage orders and generate customer bills.</p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="admin-refresh-btn"
            onClick={loadOrders}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh Orders"}
          </button>

          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {message && (
        <p className="admin-message" role="status">
          {message}
        </p>
      )}

      <section className="admin-stats">
        <article className="admin-stat-card">
          <span>Total Orders</span>
          <strong>{stats.total}</strong>
        </article>

        <article className="admin-stat-card">
          <span>Pending Orders</span>
          <strong>{stats.pending}</strong>
        </article>

        <article className="admin-stat-card">
          <span>Delivered Orders</span>
          <strong>{stats.delivered}</strong>
        </article>

        <article className="admin-stat-card">
          <span>Order Value</span>
          <strong>{money(stats.totalSales)}</strong>
        </article>
      </section>

      <section className="admin-orders-section">
        <div className="admin-section-heading">
          <h2>Customer Orders</h2>
          <span>{filteredOrders.length} orders</span>
        </div>

        <div className="admin-order-controls">
          <input
            type="search"
            placeholder="Search by order ID, customer or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search orders"
          />

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter orders by status"
          >
            <option value="All">All Orders</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <p>Loading customer orders...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="admin-empty">No orders found.</p>
        ) : (
          <div className="admin-orders-list">
            {filteredOrders.map((order) => {
              const items = getItems(order);
              const status = order.status || "Pending";

              return (
                <article className="admin-order-card" key={order.id}>
                  <div className="admin-order-top">
                    <div>
                      <h3>Order #{order.id}</h3>
                      <p>
                        {order.created_at || order.createdAt || order.date
                          ? new Date(
                              order.created_at ||
                                order.createdAt ||
                                order.date
                            ).toLocaleString("en-IN")
                          : "Date not available"}
                      </p>
                    </div>

                    <span
                      className={`admin-order-status status-${String(
                        status
                      ).toLowerCase()}`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="admin-customer-details">
                    <p>
                      <strong>Customer:</strong>{" "}
                      {order.customer_name || order.name || "N/A"}
                    </p>
                    <p>
                      <strong>Phone:</strong> {order.phone || "N/A"}
                    </p>
                    <p>
                      <strong>Address:</strong> {order.address || "N/A"}
                    </p>
                  </div>

                  <div className="admin-order-items">
                    <h4>Ordered Items</h4>

                    {items.length === 0 ? (
                      <p>Item details unavailable.</p>
                    ) : (
                      <ul>
                        {items.map((item, index) => (
                          <li key={item.id ?? index}>
                            {item.name || "Sweet"} ×{" "}
                            {Number(item.quantity || 0)} —{" "}
                            {money(
                              Number(item.price || 0) *
                                Number(item.quantity || 0)
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <h3 className="admin-order-total">
                    Total: {money(getOrderTotal(order))}
                  </h3>

                  <div className="admin-order-actions">
                    <label>
                      Update Status
                      <select
                        value={status}
                        disabled={updatingOrderId === order.id}
                        onChange={(event) =>
                          updateStatus(order, event.target.value)
                        }
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      className="admin-refresh-btn"
                      onClick={() => setSelectedBill(order)}
                    >
                      View Bill / Receipt
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selectedBill && (
        <BillReceipt
          order={selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      )}
    </main>
  );
}
