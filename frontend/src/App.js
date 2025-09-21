import React, { useState, useEffect } from 'react';
import { Search, Plus, Blocks, Activity, Hash, Clock, Database, ChevronDown, ChevronUp, Zap } from 'lucide-react';

const BlockchainApp = () => {
  const [blockchain, setBlockchain] = useState(null);
  const [transactions, setTransactions] = useState([{ from: '', to: '', amount: '', data: '' }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mining, setMining] = useState(false);
  const [status, setStatus] = useState({});
  const [expandedBlocks, setExpandedBlocks] = useState(new Set());

  const API_BASE = 'http://localhost:8080/api';

  useEffect(() => {
    fetchBlockchain();
    fetchStatus();
  }, []);

  const fetchBlockchain = async () => {
    try {
      const response = await fetch(`${API_BASE}/blockchain`);
      const data = await response.json();
      setBlockchain(data);
    } catch (error) {
      console.error('Error fetching blockchain:', error);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/status`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const addTransaction = () => {
    setTransactions([...transactions, { from: '', to: '', amount: '', data: '' }]);
  };

  const updateTransaction = (index, field, value) => {
    const updated = [...transactions];
    updated[index][field] = value;
    setTransactions(updated);
  };

  const mineBlock = async () => {
    if (transactions.some(tx => !tx.from || !tx.to || !tx.data)) {
      alert('Please fill all transaction fields');
      return;
    }

    setMining(true);
    try {
      const response = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactions),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Block mined:', result);
        setTransactions([{ from: '', to: '', amount: '', data: '' }]);
        await fetchBlockchain();
        await fetchStatus();
      }
    } catch (error) {
      console.error('Error mining block:', error);
    } finally {
      setMining(false);
    }
  };

  const searchBlockchain = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Error searching blockchain:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockExpansion = (index) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedBlocks(newExpanded);
  };

  const formatHash = (hash) => {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const BlockCard = ({ block, isSearchResult = false }) => {
    const isExpanded = expandedBlocks.has(block.index);

    return (
      <div className={`border rounded-lg p-6 ${isSearchResult ? 'border-blue-300 bg-blue-50' : 'border-gray-200'} shadow-sm hover:shadow-md transition-shadow`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-2">
            <Blocks className="text-blue-600" size={24} />
            <h3 className="text-xl font-bold">Block #{block.index}</h3>
            {block.index === 0 && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Genesis</span>
            )}
          </div>
          <button
            onClick={() => toggleBlockExpansion(block.index)}
            className="text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Hash className="text-gray-400" size={16} />
            <span className="text-sm text-gray-600">Hash:</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{formatHash(block.hash)}</code>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="text-gray-400" size={16} />
            <span className="text-sm text-gray-600">Timestamp:</span>
            <span className="text-sm">{formatTimestamp(block.timestamp)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Database className="text-gray-400" size={16} />
            <span className="text-sm text-gray-600">Nonce:</span>
            <span className="text-sm font-mono">{block.nonce}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="text-gray-400" size={16} />
            <span className="text-sm text-gray-600">Transactions:</span>
            <span className="text-sm">{block.transactions.length}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="mb-4">
              <h4 className="font-semibold text-sm mb-2">Previous Hash:</h4>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block break-all">{block.prev_hash}</code>
            </div>
            <div className="mb-4">
              <h4 className="font-semibold text-sm mb-2">Merkle Root:</h4>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block break-all">{block.merkle_root}</code>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Transactions:</h4>
              <div className="space-y-3">
                {block.transactions.map((tx, txIndex) => (
                  <div key={txIndex} className="bg-gray-50 p-3 rounded border">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>ID:</strong> {tx.id}</div>
                      <div><strong>Amount:</strong> {tx.amount}</div>
                      <div><strong>From:</strong> {tx.from}</div>
                      <div><strong>To:</strong> {tx.to}</div>
                      <div className="col-span-2"><strong>Data:</strong> {tx.data}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center space-x-3">
            <Blocks className="text-blue-600" size={40} />
            <span>Muneeb Blockchain</span>
          </h1>
          <p className="text-gray-600">Muneeb's blockchain implementation with mining, transactions, and search</p>
        </header>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
            <Activity className="text-green-600" />
            <span>Blockchain Status</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{status.blocks || 0}</div>
              <div className="text-gray-600">Total Blocks</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{status.difficulty || 0}</div>
              <div className="text-gray-600">Difficulty</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${status.is_valid ? 'text-green-600' : 'text-red-600'}`}>
                {status.is_valid ? 'VALID' : 'INVALID'}
              </div>
              <div className="text-gray-600">Chain Status</div>
            </div>
          </div>
        </div>

        {/* Add Transactions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
            <Plus className="text-blue-600" />
            <span>Add Transactions</span>
          </h2>
          
          <div className="space-y-4">
            {transactions.map((tx, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Transaction #{index + 1}</h3>
            
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="From"
                    value={tx.from}
                    onChange={(e) => updateTransaction(index, 'from', e.target.value)}
                    className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="To"
                    value={tx.to}
                    onChange={(e) => updateTransaction(index, 'to', e.target.value)}
                    className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Amount"
                    value={tx.amount}
                    onChange={(e) => updateTransaction(index, 'amount', e.target.value)}
                    className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Transaction Data"
                    value={tx.data}
                    onChange={(e) => updateTransaction(index, 'data', e.target.value)}
                    className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-4 mt-6">
            <button
              onClick={addTransaction}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>Add Transaction</span>
            </button>
            <button
              onClick={mineBlock}
              disabled={mining}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center space-x-2"
            >
              <Zap size={16} />
              <span>{mining ? 'Mining...' : 'Mine Block'}</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center space-x-2">
            <Search className="text-green-600" />
            <span>Search Blockchain</span>
          </h2>
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Search transactions, hashes, or data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchBlockchain()}
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={searchBlockchain}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 transition-colors flex items-center space-x-2"
            >
              <Search size={16} />
              <span>{loading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Search Results ({searchResults.length} blocks found)</h3>
              <div className="space-y-4">
                {searchResults.map((block) => (
                  <BlockCard key={`search-${block.index}`} block={block} isSearchResult={true} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Blockchain Display */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
            <Blocks className="text-purple-600" />
            <span>Complete Blockchain</span>
          </h2>
          
          {blockchain && blockchain.blocks ? (
            <div className="space-y-6">
              {blockchain.blocks.map((block) => (
                <BlockCard key={block.index} block={block} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Loading blockchain...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockchainApp;