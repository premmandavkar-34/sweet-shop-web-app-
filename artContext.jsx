
import { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  function addToCart(sweet) {
    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => String(item.id ?? item._id) === String(sweet.id ?? sweet._id)
      );

      if (existing) {
        return currentCart.map((item) =>
          String(item.id ?? item._id) === String(sweet.id ?? sweet._id)
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        );
      }

      return [...currentCart, { ...sweet, quantity: 1 }];
    });
  }

  function updateQuantity(id, quantity) {
    setCart((currentCart) =>
      quantity <= 0
        ? currentCart.filter(
            (item) => String(item.id ?? item._id) !== String(id)
          )
        : currentCart.map((item) =>
            String(item.id ?? item._id) === String(id)
              ? { ...item, quantity }
              : item
          )
    );
  }

  function clearCart() {
    setCart([]);
  }

  return (
    <CartContext.Provider
      value={{ cart, addToCart, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
