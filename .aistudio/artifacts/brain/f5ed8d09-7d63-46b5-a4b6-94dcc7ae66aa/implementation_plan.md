# Task 4.2 — Complete Database Architecture Design for CNA (Final Master Plan)

Authoritative architectural specification and technical blueprint for CNA Mobile Store's production-grade relational database on Supabase (PostgreSQL), incorporating Iranian e-commerce requirements, strict integer Toman currency, multi-warehouse inventory, and enterprise-grade Row-Level Security (RLS).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Summary of Confirmed Architectural Resolutions:**
> 1. **Opening Inventory & Paired Movements**: Initial inventory requires an explicit `opening_balance` record in `stock_movements`. Warehouse transfers atomically create paired `transfer_out` and `transfer_in` entries linked by `reference_id`. Row-level locks (`SELECT ... FOR UPDATE` on `warehouse_stock`) guarantee `balance_after` consistency under concurrent transactions.
> 2. **RPC-Only Mutation Discipline**: Direct client `INSERT`, `UPDATE`, and `DELETE` on `warehouse_stock` and `stock_movements` are completely blocked (`DENIED`) by RLS. All stock movements must be executed via `SECURITY DEFINER` RPC functions.
> 3. **Wallet Sub-Ledger & Projection**: `wallets.cached_balance_toman` is strictly a materialized projection. All balance mutations occur via `rpc_post_wallet_transaction()` with row-level locks and non-negative balance checks. Direct client mutations are blocked by RLS.
> 4. **Configurable Warranty Duration**: Duration is dynamic per provider/product/device (`warranties.duration_months`, `product_serial_units.warranty_duration_months`). No duration is hardcoded. Expiration is computed from delivery date.
> 5. **Late-Payment Recovery & Zero Overselling Guarantee**: When a verified gateway success callback arrives for an expired reservation, the system checks available stock with `FOR UPDATE`. If available, it auto-recovers and fulfills; if exhausted, it initiates an automatic refund and sets status to `stock_exhausted_pending_refund` without overselling.
> 6. **Exact 48-Table Inventory**: Strictly divided into 32 Initial Implementation tables and 16 Later Extension tables with a complete Master Registry documenting domains, dependencies, canonical/projection status, deletion rules, and RLS requirements.
> 7. **Strict Currency Invariant**: All monetary fields use 64-bit integer `BIGINT` in Toman. Zero floating-point numbers.
> 8. **Documentation-Only Scope**: Pure documentation across all 8 files in `docs/database/` with zero application code changes, zero package installations, and zero database executions.

---

## 1. Master Table Registry & Classification (48 Tables)

| # | Table Name | Domain | Phase | Upstream Dependencies (FK) | Data Classification | Deletion Rule | RLS Policy Requirement |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| **1** | `profiles` | Identity | Initial | `auth.users` | Canonical Truth | RESTRICT | User: Select/Update own; Admin: Manage |
| **2** | `user_addresses` | Identity | Initial | `profiles` | Canonical Truth | CASCADE | User: CRUD own addresses |
| **3** | `auth_roles` | Security | Initial | — | Canonical Truth | RESTRICT | Public: Read; Super Admin: Manage |
| **4** | `auth_permissions` | Security | Initial | — | Canonical Truth | RESTRICT | Public: Read; Super Admin: Manage |
| **5** | `auth_role_permissions`| Security| Initial | `auth_roles`, `auth_permissions`| Canonical Junction | CASCADE | Super Admin only |
| **6** | `auth_user_roles` | Security | Initial | `auth.users`, `auth_roles` | Canonical Junction | CASCADE / RESTRICT | User: Read own roles; Admin: Manage |
| **7** | `categories` | Catalog | Initial | `categories (parent)` | Canonical Truth | RESTRICT | Public: Read active; Catalog Admin: Write |
| **8** | `brands` | Catalog | Initial | — | Canonical Truth | RESTRICT | Public: Read active; Catalog Admin: Write |
| **9** | `products` | Catalog | Initial | `categories`, `brands` | Canonical Truth (+Cached JSON) | RESTRICT | Public: Read published; Catalog: Write |
| **10** | `product_images` | Catalog | Initial | `products` | Canonical Truth | CASCADE | Public: Read; Catalog Admin: Write |
| **11** | `attribute_definitions`| Specs | Initial | — | Canonical Truth | RESTRICT | Public: Read; Catalog Admin: Write |
| **12** | `category_attributes` | Specs | Initial | `categories`, `attribute_defs` | Canonical Junction | CASCADE | Public: Read; Catalog Admin: Write |
| **13** | `product_attribute_values`| Specs | Initial | `products`, `attribute_defs` | **Canonical Source of Truth** | CASCADE / RESTRICT | Public: Read; Catalog Admin: Write |
| **14** | `warranties` | Catalog | Initial | — | Canonical Truth (Dynamic) | RESTRICT | Public: Read; Catalog Admin: Write |
| **15** | `product_variants` | Catalog | Initial | `products`, `warranties` | Canonical SKU Truth | CASCADE / RESTRICT | Public: Read; Catalog/Warehouse: Write |
| **16** | `warehouses` | Inventory | Initial | — | Canonical Truth | RESTRICT | Warehouse Staff: Read; Admin: Manage |
| **17** | `warehouse_stock` | Inventory | Initial | `warehouses`, `product_variants`| **Materialized Projection** | RESTRICT | Warehouse Staff: Read; **RPC Only Mutations** |
| **18** | `stock_movements` | Inventory | Initial | `warehouses`, `product_variants`| **Canonical Immutable Ledger**| RESTRICT | Warehouse Staff: Read; **RPC Only Mutations** |
| **19** | `stock_reservations`| Inventory | Initial | `warehouses`, `product_variants`| Temporary Atomic Hold | RESTRICT / CASCADE | User: Read own; **RPC Only Mutations** |
| **20** | `carts` | Cart | Initial | `profiles` | Transient State | CASCADE / SET NULL | User: CRUD own cart / guest session |
| **21** | `cart_items` | Cart | Initial | `carts`, `product_variants` | Transient State | CASCADE | User: CRUD own cart items |
| **22** | `tax_rules` | Finance | Initial | — | Versioned Policy | RESTRICT | Public: Read active; Finance Admin: Manage |
| **23** | `orders` | Orders | Initial | `auth.users`, `shipping_methods`| Canonical Order Header | RESTRICT | User: Read own; Client Direct Write Blocked |
| **24** | `order_items` | Orders | Initial | `orders`, `product_variants` | **Immutable Purchase Snapshot**| CASCADE / RESTRICT | User: Read own invoice; Client Write Blocked |
| **25** | `order_status_history`| Orders | Initial | `orders`, `auth.users` | Immutable Audit Trail | CASCADE | User: Read own status; Staff: Insert |
| **26** | `wallets` | Finance | Initial | `auth.users` | **Materialized Projection** | RESTRICT | User: Read own; **RPC Only Mutations** |
| **27** | `wallet_transactions`| Finance | Initial | `wallets` | **Canonical Immutable Ledger**| RESTRICT | User: Read own; **RPC Only Mutations** |
| **28** | `invoices` | Finance | Initial | `orders`, `auth.users` | Official Invoice Snapshot | RESTRICT | User: Read own invoice; Mutation Blocked |
| **29** | `payments` | Finance | Initial | `orders`, `auth.users` | Canonical Payment Case | RESTRICT | User: Read own payment; Client Direct Write Blocked |
| **30** | `payment_transactions`| Finance | Initial | `payments` | Immutable Transaction Log | RESTRICT | User: Read own receipt; Direct Write Blocked |
| **31** | `shipping_methods` | Logistics | Initial | — | Canonical Truth | RESTRICT | Public: Read active; Logistics: Manage |
| **32** | `store_settings` | Settings | Initial | `auth.users` | Canonical Settings Store | RESTRICT | Public: Read public keys; Admin: Manage |
| **33** | `product_serial_units`| Serial | Extension | `product_variants`, `warehouses`| Physical Device Tracking | RESTRICT / SET NULL | Warehouse Staff: Manage via scanner |
| **34** | `inventory_transfers` | Inventory | Extension | `warehouses`, `auth.users` | Transfer Document | RESTRICT | Warehouse Staff: Create/Verify with perm |
| **35** | `inventory_transfer_items`| Inventory | Extension | `inventory_transfers`, `variants`| Transfer Lines | CASCADE / RESTRICT | Warehouse Staff: Manage lines |
| **36** | `order_returns` | Care | Extension | `orders`, `order_items`, `users` | RMA Lifecycle Case | RESTRICT | User: Request own RMA; Staff: Inspect |
| **37** | `payment_webhook_logs`| Finance | Extension | — | Idempotent Audit Log | RESTRICT | Finance Admin: Read; System: Insert |
| **38** | `shipments` | Logistics | Extension | `orders`, `methods`, `warehouses`| Carrier Consignment | RESTRICT | User: Read own; Warehouse/Carrier: Manage |
| **39** | `shipment_tracking_events`| Logistics | Extension | `shipments` | Tracking Milestones | CASCADE | User: Read timeline; Carrier: Insert |
| **40** | `coupons` | Marketing | Extension | — | Promotional Rule | RESTRICT | User: Validate; Marketing: Manage |
| **41** | `coupon_usages` | Marketing | Extension | `coupons`, `orders`, `users` | Redemption Audit Log | RESTRICT | User: Read own; System: Insert on checkout |
| **42** | `loyalty_points` | Loyalty | Extension | `auth.users` | Immutable Points Ledger | CASCADE / RESTRICT | User: Read own points; System: Insert |
| **43** | `wishlists` | Bookmarks | Extension | `profiles`, `products` | Customer Bookmarks | CASCADE | User: CRUD own bookmarks |
| **44** | `reviews` | Reviews | Extension | `products`, `profiles` | Moderated Content | CASCADE / SET NULL | Public: Read approved; User: Insert own |
| **45** | `support_tickets` | Support | Extension | `profiles`, `orders` | Support Case Thread | RESTRICT | User: CRUD own tickets; Staff: Manage |
| **46** | `ticket_messages` | Support | Extension | `support_tickets`, `auth.users` | Message History | CASCADE | Ticket Participants: Insert/Read |
| **47** | `notifications` | Alerts | Extension | `auth.users` | Dispatch Outbox Log | RESTRICT | User: Read own; System: Manage queue |
| **48** | `admin_audit_logs` | Audit | Extension | `auth.users` | Immutable Security Trail | RESTRICT | Super Admin: Read; Direct mutation Blocked |

**Total Count: Exactly 32 Initial + 16 Extension = 48 Tables.**

---

## 2. Next Steps Upon Plan Approval

Proceed to Task 4.3 (physical DDL migration generation, initial data seeding, and test verification suite).
