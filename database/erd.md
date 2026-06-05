# database/erd.md

users
  │
  └── agents
  │
  ├── agent_cards

users
  │
  └── wishes

wishes
  │
  └── demand_members
          │
          └── demands

demands
  │
  └── negotiations

negotiations
  │
  ├── proposals
  │
  └── deals

workflows
  │
  ├── sessions
  │
  ├── conversations
  │
  ├── events
  │
  └── deals
