import Navbar from "./Navbar";
import Footer from "./Footer";
import { Outlet } from "react-router-dom";

function AppLayout() {
  
  
  return (
    <div className="antialiased text-black bg-white">
      <Navbar />
    
        <Outlet/>
   
       <Footer />
    </div>
  )
  
}

export default AppLayout;