import teamsData from '../data/teams.json';
import eplMatches from '../data/epl_matches.json';
import c1Matches from '../data/c1_matches.json';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase'; // Sửa lại đường dẫn import firebase cho đúng cấu trúc nếu cần

// Helper: Xáo trộn mảng ngẫu nhiên (Fisher-Yates)
const shuffleArray = (array) => {
    let curId = array.length;
    while (0 !== curId) {
        let randId = Math.floor(Math.random() * curId);
        curId -= 1;
        let tmp = array[curId];
        array[curId] = array[randId];
        array[randId] = tmp;
    }
    return array;
};

// ==========================================
// THUẬT TOÁN CHIA ĐỘI EPL (5 Tier - Mỗi người 5 đội)
// ==========================================
const drawEPL = (players) => {
    // Copy data để có thể pop() (rút dần)
    const availableTiers = {
        tier_1: shuffleArray([...teamsData.epl_teams.tier_1]),
        tier_2: shuffleArray([...teamsData.epl_teams.tier_2]),
        tier_3: shuffleArray([...teamsData.epl_teams.tier_3]),
        tier_4: shuffleArray([...teamsData.epl_teams.tier_4]),
        tier_5: shuffleArray([...teamsData.epl_teams.tier_5]),
    };

    // ĐÃ FIX: Khởi tạo sẵn mảng rỗng assignedTiers để tránh lỗi undefined.includes()
    const newPlayers = players.map(p => ({ ...p, teams: [], assignedTiers: [] }));

    // Bước 1: Gán đội Favorite và rút đội đó khỏi pool
    newPlayers.forEach(player => {
        const favTeam = player.favoriteTeam;
        player.teams.push(favTeam);

        // Tìm xem favTeam nằm ở tier nào và xóa nó khỏi pool
        for (let tier in availableTiers) {
            const index = availableTiers[tier].indexOf(favTeam);
            if (index !== -1) {
                availableTiers[tier].splice(index, 1);
                player.assignedTiers.push(tier); // Đánh dấu đã có tier này
                break;
            }
        }
    });

    // Bước 2: Fill-up các Tier còn thiếu cho mỗi người
    newPlayers.forEach(player => {
        ['tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5'].forEach(tier => {
            if (!player.assignedTiers.includes(tier)) {
                // Rút 1 đội từ tier tương ứng
                const team = availableTiers[tier].pop();
                player.teams.push(team);
            }
        });
        delete player.assignedTiers; // Dọn dẹp data tạm trước khi lưu vào DB
    });

    return newPlayers;
};

// ==========================================
// THUẬT TOÁN CHIA ĐỘI C1 (Matrix Role - Bắt lỗi Man Utd)
// ==========================================
const drawUCL = (players) => {
    const availablePots = {
        pot_1: shuffleArray([...teamsData.c1_teams.pot_1]),
        pot_2: shuffleArray([...teamsData.c1_teams.pot_2]),
        pot_3: shuffleArray([...teamsData.c1_teams.pot_3]),
        pot_4: shuffleArray([...teamsData.c1_teams.pot_4]),
    };

    // Định nghĩa cấu trúc Role Matrix theo tài liệu của bạn
    const roles = [
        { name: 'User A', req: { pot_1: 3, pot_2: 1, pot_3: 2, pot_4: 3 } },
        { name: 'User B', req: { pot_1: 2, pot_2: 3, pot_3: 2, pot_4: 2 } },
        { name: 'User C', req: { pot_1: 2, pot_2: 3, pot_3: 2, pot_4: 2 } },
        { name: 'User D', req: { pot_1: 2, pot_2: 2, pot_3: 3, pot_4: 2 } }
    ];

    let unassignedRoles = [...roles];
    const newPlayers = players.map(p => ({ ...p, teams: [], role: null }));

    // Bước 1: Quét xem có ai Pick Man Utd không, ép vào User D
    newPlayers.forEach(player => {
        if (player.favoriteTeam === 'Manchester United') {
            const roleDIndex = unassignedRoles.findIndex(r => r.name === 'User D');
            if (roleDIndex !== -1) {
                player.role = unassignedRoles[roleDIndex];
                unassignedRoles.splice(roleDIndex, 1);
            }
        }
    });

    // Bước 2: Gán Random Role cho những người còn lại
    unassignedRoles = shuffleArray(unassignedRoles);
    newPlayers.forEach(player => {
        if (!player.role) {
            player.role = unassignedRoles.pop();
        }
    });

    // Bước 3: Rút Favourite Team khỏi pool và trừ đi 1 slot requirement của Role đó
    newPlayers.forEach(player => {
        const favTeam = player.favoriteTeam;
        player.teams.push(favTeam);

        for (let pot in availablePots) {
            const index = availablePots[pot].indexOf(favTeam);
            if (index !== -1) {
                availablePots[pot].splice(index, 1);
                player.role.req[pot] -= 1; // Giảm requirement của Pot này xuống
                break;
            }
        }
    });

    // Bước 4: Fill-up các đội còn lại dựa theo requirement của Role
    newPlayers.forEach(player => {
        ['pot_1', 'pot_2', 'pot_3', 'pot_4'].forEach(pot => {
            const needed = player.role.req[pot];
            for (let i = 0; i < needed; i++) {
                player.teams.push(availablePots[pot].pop());
            }
        });
        player.roleName = player.role.name; // Lưu lại tên Role để hiển thị (tùy chọn)
        delete player.role; // Xóa object req cho nhẹ DB
    });

    return newPlayers;
};

// HÀM CHÍNH ĐƯỢC GỌI TỪ DASHBOARD
export const startTournament = async (tournamentCode, mode, players) => {
    try {
        let draftedPlayers = [];
        let initialMatches = [];

        if (mode === 'premier_league') {
            draftedPlayers = drawEPL(players);
            initialMatches = eplMatches;
        } else if (mode === 'ucl') {
            draftedPlayers = drawUCL(players);
            initialMatches = c1Matches;
        }

        const docRef = doc(db, 'tournaments', tournamentCode);

        // Cập nhật Database: Trạng thái playing, danh sách player đã có teams, và lịch thi đấu
        await updateDoc(docRef, {
            status: 'playing',
            players: draftedPlayers,
            matches: initialMatches // Đẩy lịch thi đấu lên DB
        });

        return true;
    } catch (error) {
        console.error("Lỗi khi chia đội:", error);
        throw error;
    }
};