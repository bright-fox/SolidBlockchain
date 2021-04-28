import { BLOCKCHAIN_SETUP } from "../actions";

const blockchainReducer = (state, action) => {
  switch (action.type) {
    case BLOCKCHAIN_SETUP:
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

export default blockchainReducer;
