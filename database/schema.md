# database/schema.md

# Core Tables

## users

id
wallet_address
nickname
created_at

---

## agents

id
user_id
agent_type
did
wallet_address
status
reputation_score
agent_card_json
created_at

---

## agent_cards

agent_id
card_json
card_hash
version
created_at
updated_at

---

## wishes

id
user_id
artist_name
genre
city
preferred_date
deposit_amount    # 押金金额 (USDT)，需求聚合后汇入托管
status           # ACTIVE | FULFILLED | WITHDRAWN
created_at

---

## demands

id
title
city
genre
wish_count       # 聚合心愿数
threshold        # 触发阈值 (MIN_THRESHOLD=10)
status           # PENDING | MATCHING | NEGOTIATING | FULFILLED | FAILED
created_at

---

## demand_members

demand_id
wish_id
joined_at

---

## negotiations

id
demand_id
musician_agent_id
venue_agent_id
status           # PENDING | ACTIVE | ACCEPTED | REJECTED | TIMEOUT
started_at
ended_at

---

## proposals

id
negotiation_id
sender_agent_id
proposal_type
venue_fee
split_percentage
payload_json
created_at

---

## deals

id
negotiation_id
musician_agent_id
venue_agent_id
deal_json
status           # PENDING_CONFIRMATION | CONFIRMED | FAILED
created_at

---

## workflows

id
workflow_type
status
context_json
created_at
updated_at

---

## sessions

id
workflow_id
agent_id
status
context_json
started_at
ended_at

---

## conversations

id
workflow_id
session_id
participants
message_count
created_at
updated_at

---

## events

id
workflow_id
conversation_id
event_type
source
data_json
created_at

---

## blockchain_transactions

id
tx_hash
network
contract_name
status
payload_json
created_at

---

## tickets

id
deal_id
owner_wallet
token_id
metadata_uri
created_at
