import { useCallback, useState } from "react";
import { FeatureStrip } from "./components/FeatureStrip";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Navbar } from "./components/Navbar";
import { Products } from "./components/Products";

export default function App() {
  const [cartCount, setCartCount] = useState(0);

  const handleAddToCart = useCallback(() => {
    setCartCount((count) => count + 1);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-navy-950 font-sans text-mist-100">
      {/* Fixed ambient backdrop */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0">
        <div className="bg-grid absolute inset-0" />
        <div className="absolute -bottom-40 left-1/2 h-[420px] w-[720px] max-w-full -translate-x-1/2 rounded-full bg-royal-600/[0.07] blur-[130px]" />
      </div>

      <Navbar cartCount={cartCount} />

      <main className="relative">
        <Hero />
        <FeatureStrip />
        <Products onAdd={handleAddToCart} />
      </main>

      <Footer />
    </div>
  );
}
