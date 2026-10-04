import React from "react";
import CartCheckout from "./CartCheckout";

const OrderCart = () => (
  <section className="cart section">
    <div className="container">
      <h1 className="heading">Your order</h1>
      <CartCheckout variant="page" />
    </div>
  </section>
);

export default OrderCart;
