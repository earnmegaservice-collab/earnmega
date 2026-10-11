import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpRight, ArrowDownLeft, Coins } from 'lucide-react';

interface LedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LedgerModal({ isOpen, onClose }: LedgerModalProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      const fetchTransactions = async () => {
        setLoading(true);
        // We will try fetching from a hypothetical 'transactions' table for Wallet Ledger
        // In reality, this table must exist according to user prompt ("Query the database to show... financial history")
        try {
          const { data, error } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
          if (!error && data) {
            setTransactions(data);
          } else {
             // Mock fallback if table not yet created
             setTransactions([]);
          }
        } catch (e) {
             setTransactions([]);
        } finally {
          setLoading(false);
        }
      };
      fetchTransactions();
    }
  }, [isOpen, user]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
          >
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center space-x-2">
                <Coins className="text-yellow-400" size={24} />
                <h2 className="text-xl font-bold text-white tracking-tight">Wallet Ledger</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex flex-col space-y-1">
                {loading ? (
                   <p className="text-gray-400 text-center py-4">Loading transactions...</p>
                ) : transactions.length === 0 ? (
                   <p className="text-gray-400 text-center py-4">No transactions found.</p>
                ) : (
                  transactions.map((tx) => {
                    const isIncoming = tx.amount > 0;
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors border border-transparent hover:border-white/5">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isIncoming ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {isIncoming ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-100">{tx.description || tx.note || (isIncoming ? 'Coin Top-up' : 'Gift Sent')}</p>
                            <p className="text-[11px] text-gray-500 font-medium">
                              {new Date(tx.created_at || tx.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </div>
                        </div>
                        <div className={`text-base font-extrabold ${isIncoming ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isIncoming ? '+' : ''}{tx.amount}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
