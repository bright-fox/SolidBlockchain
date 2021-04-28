import { useEffect, useReducer } from "react";
import { idleStatus } from "../utils/variables";
import announcementReducer from "../reducers/announcementReducer";
import { RESET } from "../actions";

const useAnnouncement = () => {
  const [state, dispatchAnnouncement] = useReducer(announcementReducer, {
    status: idleStatus,
    msg: "Oops, something went wrong..",
  });
  const { status } = state;

  useEffect(() => {
    if (status !== idleStatus) {
      const timer = setTimeout(() => {
        dispatchAnnouncement({ type: RESET });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return [state, dispatchAnnouncement];
};

export default useAnnouncement;
