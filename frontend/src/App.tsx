import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Anomalies from "./pages/Anomalies";
import Cancellation from "./pages/Cancellation";
import DatasetPage from "./pages/DatasetPage";
import Fare from "./pages/Fare";
import Forecast from "./pages/Forecast";
import Overview from "./pages/Overview";
import Performance from "./pages/Performance";
import PowerBI from "./pages/PowerBI";
import Report from "./pages/Report";
import Segments from "./pages/Segments";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/cancellation" element={<Cancellation />} />
        <Route path="/fare" element={<Fare />} />
        <Route path="/segments" element={<Segments />} />
        <Route path="/forecast" element={<Forecast />} />
        <Route path="/anomalies" element={<Anomalies />} />
        <Route path="/power-bi" element={<PowerBI />} />
        <Route path="/report" element={<Report />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/dataset" element={<DatasetPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
