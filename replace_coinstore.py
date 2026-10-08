import re

with open('components/wallet/CoinStoreModal.tsx', 'r') as f:
    content = f.read()

# Make sure to import createClient from supabase and usePaystackPayment from react-paystack
import_replace = """import React, { useState, useEffect } from 'react';
import { SubscriptionTier } from '../../types/user';
import { useWallet } from '../../context/WalletContext';
import { usePaystackPayment } from 'react-paystack';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);
"""
content = content.replace("import React, { useState, useEffect } from 'react';\nimport { SubscriptionTier } from '../../types/user';\nimport { useWallet } from '../../context/WalletContext';", import_replace)


with open('components/wallet/CoinStoreModal.tsx', 'w') as f:
    f.write(content)
