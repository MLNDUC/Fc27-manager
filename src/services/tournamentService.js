import { db } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';

// Hàm tạo mã ngẫu nhiên 6 ký tự (VD: A7B9X2)
const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Hàm khởi tạo giải đấu mới trên Firebase
export const createTournament = async (hostName, mode, favoriteTeam) => {
    try {
        let roomCode = generateRoomCode();
        let isUnique = false;

        // Kiểm tra xem mã này đã tồn tại chưa, nếu có thì tạo lại
        while (!isUnique) {
            const docRef = doc(db, 'tournaments', roomCode);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                isUnique = true;
            } else {
                roomCode = generateRoomCode();
            }
        }

        // Cấu trúc dữ liệu của một giải đấu khi mới tạo
        const tournamentData = {
            code: roomCode,
            mode: mode, // 'premier_league' hoặc 'ucl'
            hostName: hostName,
            status: 'waiting', // waiting, playing, finished
            createdAt: serverTimestamp(),
            players: [
                {
                    id: 'host-id-temp', // Tạm thời để fix cứng, sau này dùng UUID
                    name: hostName,
                    isHost: true,
                    favoriteTeam: favoriteTeam,
                    teams: [] // Sẽ được thuật toán chia bảng random sau
                }
            ],
            matches: []
        };

        // Lưu vào Firestore collection 'tournaments' với ID là mã phòng
        await setDoc(doc(db, 'tournaments', roomCode), tournamentData);

        return roomCode;
    } catch (error) {
        console.error("Error creating tournament:", error);
        throw error;
    }
};

// Hàm tham gia giải đấu bằng mã Code
export const joinTournament = async (playerName, roomCode, favoriteTeam) => {
    try {
        const docRef = doc(db, 'tournaments', roomCode);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error("Tournament not found! Please check the code.");
        }

        const tournamentData = docSnap.data();

        // Kiểm tra xem giải đấu đã bắt đầu chưa
        if (tournamentData.status !== 'waiting') {
            throw new Error("Tournament has already started or finished!");
        }

        // Giới hạn số người chơi (Tối đa 4 người)
        if (tournamentData.players.length >= 4) {
            throw new Error("Room is full (Max 4 players)!");
        }

        // Kiểm tra xem tên người chơi đã bị trùng trong phòng chưa
        const isNameTaken = tournamentData.players.some(p => p.name.toLowerCase() === playerName.toLowerCase());
        if (isNameTaken) {
            throw new Error("This name is already taken in the room. Choose another name!");
        }

        // Thêm người chơi mới vào mảng players
        const newPlayer = {
            id: `player-${Date.now()}`,
            name: playerName,
            isHost: false,
            favoriteTeam: favoriteTeam,
            teams: []
        };

        await updateDoc(docRef, {
            players: arrayUnion(newPlayer)
        });

        return true;
    } catch (error) {
        console.error("Error joining tournament:", error);
        throw error;
    }
};