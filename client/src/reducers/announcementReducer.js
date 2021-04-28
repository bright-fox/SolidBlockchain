import { ERROR, SUCCESS, RESET } from "../actions";
import { errorStatus, successStatus, idleStatus } from "../utils/variables";

const announcementReducer = (state, action) => {
  switch (action.type) {
    case ERROR:
      return { ...state, ...action.payload, status: errorStatus };
    case SUCCESS:
      return { ...state, ...action.payload, status: successStatus };
    case RESET:
      return {
        ...state,
        message: "Oops, something went wrong!",
        status: idleStatus,
      };
    default:
      return state;
  }
};

export default announcementReducer;
