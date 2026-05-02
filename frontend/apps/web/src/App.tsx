import { Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import About from './pages/About'

import Cart from './pages/Cart'
import Chatbot from './pages/Chatbot'
import ProductDetail from './pages/ProductDetail'

function App() {
  return (
     <CartProvider>
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="about" element={<About />} />
        <Route path="cart" element={<Cart />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/product/:id" element={<ProductDetail />} />
      </Route>
    </Routes>
    </CartProvider>
  )
}

export default App
