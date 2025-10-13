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
            `SELECT 
                u.company_name,
                MAX(b.amount) AS final_bid
            FROM bids b
            JOIN users u ON b.user_id = u.id
            WHERE b.auction_id = ?
            GROUP BY u.company_name
            ORDER BY final_bid DESC`,
            [auctionId]
        );

        // Assign rank manually in JS
        let currentRank = 1;
        let previousBid = null;
        
        const rankedBids = bids.map((bid, index) => {
            if (previousBid !== null && bid.final_bid === previousBid) {
                // Same rank for ties
                bid.rank = currentRank;
            } else {
                bid.rank = index + 1;
                currentRank = index + 1;
            }
            previousBid = bid.final_bid;
            return bid;
        });

        res.json({ 
            auctionId, 
            bids: rankedBids 
        });
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

        // 1. Fetch auction details
        const [auctionResults] = await db.execute(
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
                open_to_all,
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

        // 2. Fetch bids summary with bid ranks - FIXED: Changed DESC to ASC for lowest price as rank 1
        const [bids] = await db.execute(
            `SELECT
                u.company_name,
                u.id as user_id,
                MIN(b.amount) AS pre_bid_offer,
                MAX(b.amount) AS final_bid_offer,
                COUNT(b.id) AS total_bids,
                RANK() OVER (ORDER BY MAX(b.amount) ASC) AS bid_rank
            FROM bids b
            JOIN users u ON b.user_id = u.id
            WHERE b.auction_id = ?
            GROUP BY u.id, u.company_name
            ORDER BY bid_rank ASC`,
            [auctionId]
        );

        // 3. Prepare response with formatted times
        const response = {
            ...auction,
            start_time: formatTimeTo12Hour(auction.start_time),
            end_time: formatTimeTo12Hour(auction.end_time),
            open_to_all: auction.open_to_all ? 'Yes' : 'No',
            bids: bids,
            summary: {
                total_bidders: bids.length,
                highest_bid: bids.length > 0 ? Math.max(...bids.map(bid => bid.final_bid_offer)) : auction.current_price || 0
            }
        };

        // Remove the original pre_bid_allowed field
        delete response.pre_bid_allowed;

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
    
    try {
        let timeToFormat = timeString;
        
        // If it's a full datetime string like "2025-10-10T07:55:00.000Z"
        if (timeString.includes('T') && timeString.includes(':')) {
            // Extract just the time part (HH:MM:SS)
            const timePart = timeString.split('T')[1]?.split('.')[0] || timeString.split('T')[1] || timeString;
            timeToFormat = timePart;
        }
        
        // Now process the time string
        const [hours, minutes, seconds] = timeToFormat.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        
        return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
        console.warn('Error formatting time:', error, 'Input:', timeString);
        return timeString;
    }
}

function calculateTimeRemaining(endTime) {
    if (!endTime) return 0;
    
    try {
        const now = new Date();
        const end = new Date(endTime);
        const diff = end - now;
        
        return Math.max(0, Math.floor(diff / 1000));
    } catch (error) {
        console.warn('Error calculating time remaining:', error);
        return 0;
    }
}

function getTimeStatus(startTime, endTime) {
    if (!startTime || !endTime) return "unknown";
    
    try {
        const now = new Date();
        const start = new Date(startTime);
        const end = new Date(endTime);
        
        if (now < start) return "upcoming";
        if (now >= start && now <= end) return "live";
        return "completed";
    } catch (error) {
        console.warn('Error getting time status:', error);
        return "unknown";
    }
}

// Additional data fetching functions
async function getCreatorInfo(userId) {
    try {
        const [results] = await db.execute(
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
        const [results] = await db.execute(
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
        const [results] = await db.execute(
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
        const [results] = await db.execute(
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
        const [auctions] = await db.execute(
            `SELECT 
                id,
                title,
                status,
                auction_date,
                start_time,
                TIME(DATE_ADD(TIMESTAMP(auction_date, start_time), INTERVAL duration MINUTE)) AS end_time,
                pre_bid_allowed,
                open_to_all,
                'created' as auction_type
            FROM auctions 
            WHERE created_by = ?
            ORDER BY auction_date DESC, start_time DESC`,
            [userId]
        );

        // Format the response with 12-hour time format
        const formattedAuctions = auctions.map(auction => ({
            id: auction.id,
            title: auction.title,
            status: auction.status,
            auction_date: auction.auction_date,
            start_time: formatTimeTo12Hour(auction.start_time),
            end_time: formatTimeTo12Hour(auction.end_time),
            auction_type: auction.auction_type,
            open_to_all: auction.open_to_all ? 'Yes' : 'No'
        }));

        res.json({
            success: true,
            auctions: formattedAuctions,
            count: formattedAuctions.length
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
