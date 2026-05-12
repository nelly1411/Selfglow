import { Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import About from './pages/About'

import Cart from './pages/Cart'
import Chatbot from './pages/Chatbot'
import Wishlist from './pages/Wishlist'
import Login from './pages/Login'
import ProductDetail from './pages/ProductDetail'
import { WishlistProvider } from './context/WishlistContext'
import { ReviewsProvider } from '@/context/ReviewsContext'
import Profile from './pages/Profile'

function App() {
  return (
    <CartProvider>
      <WishlistProvider>
        <ReviewsProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="shop" element={<Shop />} />
              <Route path="about" element={<About />} />
              <Route path="cart" element={<Cart />} />
              <Route path="chatbot" element={<Chatbot />} />
              <Route path="login" element={<Login />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="product/:id" element={<ProductDetail />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Routes>
        </ReviewsProvider>
      </WishlistProvider>
    </CartProvider>
  )
}

export default App
