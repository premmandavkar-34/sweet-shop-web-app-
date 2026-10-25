
import { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  function addToCart(sweet) {
    if (!sweet || sweet.id == null || !sweet.name) {
      return;
    }

    const price = Number(sweet.price);

    if (!Number.isFinite(price) || price < 0) {
      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => String(item.id) === String(sweet.id)
      );

      if (existing) {
        return currentCart.map((item) =>
          String(item.id) === String(sweet.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...currentCart,
        { ...sweet, price, quantity: 1 },
      ];
    });
  }

  function updateQuantity(id, change) {
    if (change !== 1 && change !== -1) return;

    setCart((currentCart) =>
      currentCart
        .map((item) =>
          String(item.id) === String(id)
            ? { ...item, quantity: item.quantity + change }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(id) {
    setCart((currentCart) =>
      currentCart.filter((item) => String(item.id) !== String(id))
    );
  }

  function clearCart() {
    setCart([]);
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
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
