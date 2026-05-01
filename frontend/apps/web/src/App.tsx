import { Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import About from './pages/About'

import Cart from './pages/Cart'
import Chatbot from './pages/Chatbot'

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
      </Route>
    </Routes>
    </CartProvider>
  )
}

export default App
