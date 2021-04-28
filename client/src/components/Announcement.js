import { Alert } from "react-bootstrap";
import { errorStatus } from "../utils/variables";
import "./Announcement.css";

const Announcement = ({ status, message }) => {
  return (
    <Alert
      variant={status === errorStatus ? "danger" : "success"}
      className="announcement"
    >
      {message}
    </Alert>
  );
};

export default Announcement;
