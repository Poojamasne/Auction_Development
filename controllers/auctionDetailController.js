const db = require('../db'); // your MySQL connection

// Get auction details by ID
exports.getAuctionDetails = async (req, res) => {
    const auctionId = req.params.id;

    try {
        const [rows] = await db.execute(
            `SELECT 
          id,
          title,
          description,
          auction_date,
          start_time,
          DATE_ADD(TIMESTAMP(auction_date, start_time), INTERVAL duration MINUTE) AS end_time,
          pre_bid_allowed,
          currency,
          decremental_value
       FROM auctions
       WHERE id = ?`,
            [auctionId]
        );

        if (rows.length === 0) return res.status(404).json({ message: 'Auction not found' });

        // Format response for frontend
        const auction = rows[0];
        auction.open_to_all = auction.pre_bid_allowed ? 'Yes' : 'No';
        delete auction.pre_bid_allowed;

        res.json(auction);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get simplified bid summary for an auction
exports.getAuctionBids = async (req, res) => {
    const auctionId = req.params.id;

    try {
        // Fetch highest bid per participant (company)
        const [bids] = await db.execute(
            `SELECT u.company_name,
              MAX(b.amount) AS final_bid
       FROM bids b
       JOIN users u ON b.user_id = u.id
       WHERE b.auction_id = ?
       GROUP BY u.company_name
       ORDER BY final_bid DESC`,
            [auctionId]
        );

        // Assign rank manually in JS
        let rank = 1;
        const rankedBids = bids.map((b, index) => {
            if (index > 0 && b.final_bid === bids[index - 1].final_bid) {
                // same rank as previous
                b.rank = rankedBids[index - 1].rank;
            } else {
                b.rank = rank;
            }
            rank++;
            return b;
        });

        res.json({ auctionId, bids: rankedBids });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get auction report by ID
exports.getAuctionReport = async (req, res) => {
    const auctionId = req.params.id;

    if (!auctionId || isNaN(auctionId)) {
        return res.status(400).json({ message: "Invalid auction ID" });
    }

    try {
        console.log(`Fetching auction report for ID: ${auctionId}`);

        // 1. Fetch auction details - using correct columns from your table
        const [auctionResults] = await db.query(
            `SELECT 
                id, 
                title, 
                description, 
                auction_date, 
                start_time, 
                end_time,
                duration,
                currency,
                current_price,
                decremental_value,
                pre_bid_allowed,
                status,
                created_by,
                winner_id,
                created_at,
                updated_at,
                winner_notified
            FROM auctions 
            WHERE id = ?`,
            [auctionId]
        );

        if (!auctionResults || auctionResults.length === 0) {
            return res.status(404).json({ message: "Auction not found" });
        }

        const auction = auctionResults[0];

        // 2. Fetch bids summary with bid ranks
        const [bids] = await db.query(
            `SELECT 
                u.company_name,
                u.id as user_id,
                MIN(b.amount) AS pre_bid_offer,
                MAX(b.amount) AS final_bid_offer,
                COUNT(b.id) AS total_bids,
                RANK() OVER (ORDER BY MAX(b.amount) DESC) AS bid_rank
            FROM bids b
            JOIN users u ON b.user_id = u.id
            WHERE b.auction_id = ?
            GROUP BY u.id, u.company_name
            ORDER BY bid_rank ASC`,
            [auctionId]
        );

        // 3. Convert times to 12-hour format
        const convertTo12Hour = (timeString) => {
            if (!timeString) return '';
            
            const [hours, minutes, seconds] = timeString.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            
            return `${hour12}:${minutes} ${ampm}`;
        };

        // 4. Prepare response with formatted times
        const response = {
            ...auction,
            start_time: convertTo12Hour(auction.start_time),
            end_time: convertTo12Hour(auction.end_time),
            bids: bids,
            summary: {
                total_bidders: bids.length,
                highest_bid: bids.length > 0 ? bids[0].final_bid_offer : auction.current_price || 0
            }
        };

        // 5. Return combined response
        res.json(response);

    } catch (err) {
        console.error("Error fetching auction report:", err);
        res.status(500).json({ 
            message: "Internal server error",
            error: err.message
        });
    }
};

// Helper functions
function formatTimeTo12Hour(timeString) {
    if (!timeString) return "";
    
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
}

function calculateTimeRemaining(endTime) {
    if (!endTime) return 0;
    
    const now = new Date();
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = end - now;
    
    return Math.max(0, Math.floor(diff / 1000));
}

function getTimeStatus(startTime, endTime) {
    if (!startTime || !endTime) return "unknown";
    
    const now = new Date();
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "live";
    return "completed";
}

// Additional data fetching functions
async function getCreatorInfo(userId) {
    try {
        const [results] = await db.query(
            `SELECT company_name, person_name, phone, email 
             FROM users 
             WHERE id = ?`,
            [userId]
        );
        return results[0] || null;
    } catch (error) {
        console.warn("Error fetching creator info:", error.message);
        return null;
    }
}

async function getWinnerInfo(userId) {
    try {
        const [results] = await db.query(
            `SELECT company_name, person_name, phone, email 
             FROM users 
             WHERE id = ?`,
            [userId]
        );
        return results[0] || null;
    } catch (error) {
        console.warn("Error fetching winner info:", error.message);
        return null;
    }
}

async function getParticipants(auctionId) {
    try {
        const [results] = await db.query(
            `SELECT 
                id,
                user_id,
                phone_number,
                status,
                invited_at,
                joined_at,
                person_name,
                company_name
             FROM auction_participants 
             WHERE auction_id = ?`,
            [auctionId]
        );
        return results || [];
    } catch (error) {
        console.warn("Error fetching participants:", error.message);
        return [];
    }
}

async function getDocuments(auctionId) {
    try {
        const [results] = await db.query(
            `SELECT 
                id,
                file_name,
                file_url,
                file_type,
                uploaded_at
             FROM auction_documents 
             WHERE auction_id = ?`,
            [auctionId]
        );
        return results || [];
    } catch (error) {
        console.warn("Error fetching documents:", error.message);
        return [];
    }
}

// Get all auctions for dropdown
// Get all auctions for a user
exports.getAllAuctions = async (req, res) => {
    const userId = req.query.userId;

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ 
            success: false,
            message: "Invalid user ID" 
        });
    }

    try {
        const [auctions] = await db.query(
            `SELECT 
                id,
                title,
                status,
                auction_date,
                start_time,
                DATE_ADD(TIMESTAMP(auction_date, start_time), INTERVAL duration MINUTE) AS end_time,
                pre_bid_allowed,
                'created' as auction_type
            FROM auctions 
            WHERE created_by = ?
            ORDER BY auction_date DESC, start_time DESC`,
            [userId]
        );

        // Format the response
        const formattedAuctions = auctions.map(auction => ({
            ...auction,
            open_to_all: auction.pre_bid_allowed ? 'Yes' : 'No'
        }));

        // Remove pre_bid_allowed field from response if you don't want both
        const finalAuctions = formattedAuctions.map(({ pre_bid_allowed, ...auction }) => auction);

        res.json({
            success: true,
            auctions: finalAuctions,
            count: finalAuctions.length
        });

    } catch (err) {
        console.error("Error fetching user auctions:", err);
        res.status(500).json({ 
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
};
