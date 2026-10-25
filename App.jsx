
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";

import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Admin from "./pages/Admin";

import { CartProvider, useCart } from "./CartContext";
import "./App.css";

function Layout() {
  const { cart } = useCart();

  const cartCount = cart.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1),
    0
  );

  return (
    <div className="shop">
      {/* Navigation Bar */}
      <header className="navbar">
        <NavLink className="brand" to="/">
          ✦ SWEET <b>HOUSE</b>
        </NavLink>

        <nav>
          <NavLink to="/" end>
            Home & Sweets
          </NavLink>

          <NavLink to="/cart">
            Cart & Checkout ({cartCount})
          </NavLink>

          <NavLink to="/admin">
            Admin Dashboard
          </NavLink>
        </nav>
      </header>

      {/* Page Content */}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/cart" element={<Cart />} />

          <Route path="/admin" element={<Admin />} />

          {/* Unknown URL redirects to Home */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Sharing happiness, one sweet at a time. ♥</p>
        <small>© 2026 Sweet House</small>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Layout />
      </CartProvider>
    </BrowserRouter>
  );
}
