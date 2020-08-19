import axios from 'axios';

const apiBaseURL = "https://localhost:8080";

export const getRoom = async (roomId: string) => {
  const URL = `${apiBaseURL}/rooms/${roomId}`;
  const { data: { room } } = await axios.get(URL);
  
  return room;
};