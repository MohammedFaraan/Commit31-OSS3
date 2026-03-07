import { Routes, Route ,BrowserRouter} from "react-router-dom";
import Register from "./pages/Register";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";

export default function App() {
  return (
    <main>
      <BrowserRouter>
        <Routes> 
          /*  Nested Routes */
          <Route element={<AppLayout/>}>
        <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
             <Route path="/login" element={<Login />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </main>
  );
}


