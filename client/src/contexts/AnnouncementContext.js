import React from "react";
import { idleStatus } from "../utils/variables";

export default React.createContext({
  announcementState: {
    status: idleStatus,
    msg: "Oops, something went wrong..",
  },
  dispatchAnnouncement: () => {},
});
