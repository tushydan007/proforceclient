import { useAppDispatch, useAppSelector } from "../hooks";
import { clearCart, removeRegion } from "../redux/slices/cartSlice";
import toast from "react-hot-toast";
import { FaRegTrashAlt } from "react-icons/fa";

export default function Cart() {
  const regions = useAppSelector((s) => s.cart.regions);
  const dispatch = useAppDispatch();

  const handleRemove = (id: string) => {
    dispatch(removeRegion(id));
    const nextCount = regions.length - 1;
    toast("Region removed. Cart: " + nextCount, { icon: "ℹ️" });
  };

  return (
    <aside className="h-[calc(100vh-64px)] bg-white border-l flex flex-col">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="font-semibold">Cart</div>
        <button
          className="text-sm text-red-500 hover:no-underline border border-red-500 rounded-lg px-4 cursor-pointer hover:text-white hover:bg-red-500 transition-colors duration-500 ease-in-out"
          onClick={() => {
            dispatch(clearCart());
            toast("Cart cleared.", { icon: "🧹" });
          }}
        >
          Clear
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {regions.length === 0 ? (
          <p className="text-sm text-gray-500">
            No regions selected yet. Draw a polygon or rectangle on the map.
          </p>
        ) : (
          regions.map((r) => (
            <div key={r.id} className="border rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="font-medium">{r.name}</div>
                <button
                  className="text-red-600 text-sm hover:no-underline cursor-pointer"
                  onClick={() => handleRemove(r.id)}
                >
                  <FaRegTrashAlt />
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                GeoJSON type: {r.geojson.geometry?.type}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t text-sm text-gray-600">
        Total items: <span className="font-semibold">{regions.length}</span>
      </div>
    </aside>
  );
}
