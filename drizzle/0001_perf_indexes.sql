CREATE INDEX "idx_transactions_tenant_status" ON "transactions" USING btree ("tenantId","lifecycleStatus");--> statement-breakpoint
CREATE INDEX "idx_transactions_tenant_reversed" ON "transactions" USING btree ("tenantId","isReversed");--> statement-breakpoint
CREATE INDEX "idx_transactions_tenant_date" ON "transactions" USING btree ("tenantId","transactionDate");--> statement-breakpoint
CREATE INDEX "idx_users_tenant" ON "users" USING btree ("tenantId");