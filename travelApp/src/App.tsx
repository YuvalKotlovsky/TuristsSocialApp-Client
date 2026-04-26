import "./App.css";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/Routes";

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col items-center justify-center">
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
