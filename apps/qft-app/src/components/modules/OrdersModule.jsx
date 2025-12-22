import { FaClipboardList, FaBox } from 'react-icons/fa';

function OrdersModule({ user }) {
  return (
    <div className="qft-card">
      <h2><FaClipboardList /> Orders</h2>
      <p>Submit and track your service requests.</p>
      <button className="qft-button"><FaBox /> New Order</button>
    </div>
  );
}
export default OrdersModule;