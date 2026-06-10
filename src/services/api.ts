import axios from "axios";

// We define the structure right here to bypass the stubborn VS Code import error
export interface Appliance {
  name: string;
  wattage: number;
  priority: string | number;
  peak_hour?: number;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.100.41:8000";

export const fetchOptimization = async (
  appliances: Appliance[],
  budget: number,
  electricityRate: number,
  currentHour: number,
) => {
  try {
    const response = await axios.post(`${API_URL}/optimize`, {
      appliances: appliances,
      budget: budget,
      electricity_rate: electricityRate,
      current_hour: currentHour,
    });

    return response.data;
  } catch (error) {
    console.error("Optimization Engine Error:", error);
    throw error;
  }
};
