package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

// Transaction represents a transaction in the blockchain
type Transaction struct {
	ID     string `json:"id"`
	From   string `json:"from"`
	To     string `json:"to"`
	Amount string `json:"amount"`
	Data   string `json:"data"`
	GasFee string `json:"gas_fee"`
}


// MerkleNode represents a node in the Merkle tree
type MerkleNode struct {
	Left  *MerkleNode
	Right *MerkleNode
	Data  []byte
}

// Block represents a block in the blockchain
type Block struct {
	Index        int           `json:"index"`
	Timestamp    int64         `json:"timestamp"`
	Transactions []Transaction `json:"transactions"`
	PrevHash     string        `json:"prev_hash"`
	Hash         string        `json:"hash"`
	Nonce        int           `json:"nonce"`
	MerkleRoot   string        `json:"merkle_root"`
}

// Blockchain represents the blockchain
type Blockchain struct {
	Blocks     []Block `json:"blocks"`
	Difficulty int     `json:"difficulty"`
}

var blockchain Blockchain
var pendingTransactions []Transaction // Global pool for pending transactions

// NewMerkleNode creates a new Merkle tree node
func NewMerkleNode(left, right *MerkleNode, data []byte) *MerkleNode {
	node := MerkleNode{}

	if left == nil && right == nil {
		hash := sha256.Sum256(data)
		node.Data = hash[:]
	} else {
		prevHashes := append(left.Data, right.Data...)
		hash := sha256.Sum256(prevHashes)
		node.Data = hash[:]
	}

	node.Left = left
	node.Right = right

	return &node
}

// NewMerkleTree creates a new Merkle tree from transactions
func NewMerkleTree(transactions []Transaction) *MerkleNode {
	var nodes []MerkleNode

	// Create leaf nodes for each transaction
	for _, tx := range transactions {
		data, _ := json.Marshal(tx)
		node := NewMerkleNode(nil, nil, data)
		nodes = append(nodes, *node)
	}

	// If no transactions, create a single node with empty data
	if len(nodes) == 0 {
		node := NewMerkleNode(nil, nil, []byte(""))
		return node
	}

	// Build the tree bottom-up
	for len(nodes) > 1 {
		var level []MerkleNode

		for i := 0; i < len(nodes); i += 2 {
			if i+1 < len(nodes) {
				node := NewMerkleNode(&nodes[i], &nodes[i+1], nil)
				level = append(level, *node)
			} else {
				// If odd number of nodes, duplicate the last one
				node := NewMerkleNode(&nodes[i], &nodes[i], nil)
				level = append(level, *node)
			}
		}
		nodes = level
	}

	return &nodes[0]
}

// CalculateHash calculates the hash of a block
func (b *Block) CalculateHash() string {
	data := strconv.Itoa(b.Index) + strconv.FormatInt(b.Timestamp, 10) + b.PrevHash + b.MerkleRoot + strconv.Itoa(b.Nonce)
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// MineBlock mines a block using Proof of Work
func (b *Block) MineBlock(difficulty int) {
	target := strings.Repeat("0", difficulty)

	fmt.Printf("Mining block %d...\n", b.Index)
	startTime := time.Now()

	for {
		b.Hash = b.CalculateHash()
		if strings.HasPrefix(b.Hash, target) {
			fmt.Printf("Block mined: %s in %v\n", b.Hash, time.Since(startTime))
			break
		}
		b.Nonce++
	}
}

// CreateGenesisBlock creates the first block in the blockchain
func CreateGenesisBlock() Block {
	genesisTransactions := []Transaction{
	{
		ID:     "genesis",
		From:   "system",
		To:     "system",
		Amount: "0",
		Data:   "Genesis Block - Welcome to Muneeb's blockchain",
		GasFee: "0",
	},
}


	merkleTree := NewMerkleTree(genesisTransactions)
	merkleRoot := hex.EncodeToString(merkleTree.Data)

	genesisBlock := Block{
		Index:        0,
		Timestamp:    time.Now().Unix(),
		Transactions: genesisTransactions,
		PrevHash:     "0",
		Hash:         "",
		Nonce:        0,
		MerkleRoot:   merkleRoot,
	}

	genesisBlock.MineBlock(2) // Lower difficulty for genesis block
	return genesisBlock
}

// AddBlock adds a new block to the blockchain
func (bc *Blockchain) AddBlock(transactions []Transaction) {
	prevBlock := bc.Blocks[len(bc.Blocks)-1]

	// Create Merkle tree for transactions
	merkleTree := NewMerkleTree(transactions)
	merkleRoot := hex.EncodeToString(merkleTree.Data)

	newBlock := Block{
		Index:        prevBlock.Index + 1,
		Timestamp:    time.Now().Unix(),
		Transactions: transactions,
		PrevHash:     prevBlock.Hash,
		Hash:         "",
		Nonce:        0,
		MerkleRoot:   merkleRoot,
	}

	newBlock.MineBlock(bc.Difficulty)
	bc.Blocks = append(bc.Blocks, newBlock)
}

// IsChainValid validates the blockchain
func (bc *Blockchain) IsChainValid() bool {
	for i := 1; i < len(bc.Blocks); i++ {
		currentBlock := bc.Blocks[i]
		prevBlock := bc.Blocks[i-1]

		if currentBlock.Hash != currentBlock.CalculateHash() {
			return false
		}

		if currentBlock.PrevHash != prevBlock.Hash {
			return false
		}
	}
	return true
}

// SearchBlockchain searches for data in the blockchain
func (bc *Blockchain) SearchBlockchain(query string) []Block {
	var results []Block
	query = strings.ToLower(query)

	for _, block := range bc.Blocks {
		// Search in transactions
		for _, tx := range block.Transactions {
			if strings.Contains(strings.ToLower(tx.Data), query) ||
				strings.Contains(strings.ToLower(tx.From), query) ||
				strings.Contains(strings.ToLower(tx.To), query) ||
				strings.Contains(strings.ToLower(tx.Amount), query) ||
				strings.Contains(strings.ToLower(tx.ID), query) {
				results = append(results, block)
				break
			}
		}

		// Search in block hash
		if strings.Contains(strings.ToLower(block.Hash), query) {
			results = append(results, block)
		}
	}

	return results
}

// API Handlers

// getPendingTransactions handler
func getPendingTransactions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(pendingTransactions)
}

// addTransaction handler now adds to pending pool
func addTransaction(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var transactions []Transaction
	if err := json.NewDecoder(r.Body).Decode(&transactions); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid JSON"})
		return
	}

	// Add timestamp and a unique ID to each transaction
	for i := range transactions {
		transactions[i].ID = fmt.Sprintf("tx_%d_%d", time.Now().UnixNano(), i)
		pendingTransactions = append(pendingTransactions, transactions[i])
	}

	response := map[string]interface{}{
		"message":              "Transactions added to pending pool",
		"pending_count":        len(pendingTransactions),
		"pending_transactions": pendingTransactions,
	}

	json.NewEncoder(w).Encode(response)
}

// mineBlock handler now mines selected transactions
func mineBlock(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var selectedIDs []string
	if err := json.NewDecoder(r.Body).Decode(&selectedIDs); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid JSON body, expecting an array of transaction IDs"})
		return
	}

	var transactionsToMine []Transaction
	var remainingTransactions []Transaction
	minedIDs := make(map[string]bool)

	// Select transactions based on IDs and remove them from the pending pool
	for _, tx := range pendingTransactions {
		found := false
		for _, id := range selectedIDs {
			if tx.ID == id {
				transactionsToMine = append(transactionsToMine, tx)
				minedIDs[id] = true
				found = true
				break
			}
		}
		if !found {
			remainingTransactions = append(remainingTransactions, tx)
		}
	}

	if len(transactionsToMine) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "No valid transactions selected to mine"})
		return
	}

	blockchain.AddBlock(transactionsToMine)
	pendingTransactions = remainingTransactions // Update the pending pool

	response := map[string]interface{}{
		"message": "Block mined successfully",
		"block":   blockchain.Blocks[len(blockchain.Blocks)-1],
	}
	json.NewEncoder(w).Encode(response)
}

func getBlockchain(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(blockchain)
}

func searchBlockchain(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	query := r.URL.Query().Get("q")
	if query == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Query parameter 'q' is required"})
		return
	}

	results := blockchain.SearchBlockchain(query)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"query":   query,
		"results": results,
		"count":   len(results),
	})
}

func getBlockchainStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	status := map[string]interface{}{
		"blocks":           len(blockchain.Blocks),
		"difficulty":       blockchain.Difficulty,
		"is_valid":         blockchain.IsChainValid(),
		"pending_tx_count": len(pendingTransactions),
	}

	json.NewEncoder(w).Encode(status)
}

func main() {
	// Initialize blockchain with genesis block
	blockchain = Blockchain{
		Blocks:     []Block{CreateGenesisBlock()},
		Difficulty: 4,
	}

	fmt.Println("Muneeb's Blockchain initialized with genesis block")
	fmt.Printf("Genesis block hash: %s\n", blockchain.Blocks[0].Hash)

	// Setup routes
	router := mux.NewRouter()

	// API routes
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/blockchain", getBlockchain).Methods("GET")
	api.HandleFunc("/transactions", addTransaction).Methods("POST")
	api.HandleFunc("/mine", mineBlock).Methods("POST")
	api.HandleFunc("/pending", getPendingTransactions).Methods("GET")
	api.HandleFunc("/search", searchBlockchain).Methods("GET")
	api.HandleFunc("/status", getBlockchainStatus).Methods("GET")

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	handler := c.Handler(router)

	fmt.Println("Muneeb's Blockchain starting on :8080...")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
