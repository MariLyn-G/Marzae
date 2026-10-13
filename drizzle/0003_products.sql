CREATE TABLE "product_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"content_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"author" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"numeral" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"rating" integer DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"dims" text DEFAULT '' NOT NULL,
	"volume" text DEFAULT '' NOT NULL,
	"laptop" text DEFAULT '' NOT NULL,
	"weight" text DEFAULT '' NOT NULL,
	"blurb" text DEFAULT '' NOT NULL,
	"spec3d" jsonb NOT NULL,
	"still_leather" text DEFAULT 'black-oxide' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "order_lines" ADD COLUMN "product_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_photos" ADD CONSTRAINT "product_photos_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_photos_product_idx" ON "product_photos" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_status_position_idx" ON "products" USING btree ("status","position");