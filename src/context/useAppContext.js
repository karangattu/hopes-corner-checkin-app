import { useContext } from "react";
import AppContext from "./internalContext";

export const useAppContext = () => useContext(AppContext);
