CREATE TABLE users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email varchar(255) NOT NULL UNIQUE,
  display_name varchar(120),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE users IS 'Customers of the test store';
COMMENT ON COLUMN users.email IS 'Unique customer email';

CREATE TABLE products (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(200) NOT NULL,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id),
  total numeric(12,2) NOT NULL CHECK (total >= 0),
  status varchar(32) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_id_idx ON orders(user_id);

CREATE SCHEMA analytics;
CREATE TABLE analytics.events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_name text NOT NULL,
  payload jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO users (email, display_name) VALUES ('alice@example.test', 'Alice'), ('bob@example.test', 'Bob');
INSERT INTO products (name, price, attributes) VALUES ('Keyboard', 99.90, '{"color":"green"}'), ('Mouse', 39.50, '{"wireless":true}');
INSERT INTO orders (user_id, total, status) VALUES (1, 99.90, 'paid'), (2, 39.50, 'pending');
INSERT INTO analytics.events (event_name, payload) VALUES ('order_created', '{"orderId":1}');
