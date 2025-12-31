import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function useProvedores() {
  const [provedores, setProvedores] = useState([]);
  useEffect(() => {
    async function fetchProvedores() {
      const snapshot = await getDocs(collection(db, 'provedores'));
      setProvedores(snapshot.docs.map(doc => doc.data().nome));
    }
    fetchProvedores();
  }, []);
  return provedores;
}
