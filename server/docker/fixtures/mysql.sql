CREATE TABLE users (
  id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email varchar(255) NOT NULL UNIQUE COMMENT 'Unique customer email',
  display_name varchar(120),
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Customers of the test store';

CREATE TABLE products (
  id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name varchar(200) NOT NULL,
  price decimal(12,2) NOT NULL,
  attributes json,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT products_price_check CHECK (price >= 0)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id bigint unsigned NOT NULL,
  total decimal(12,2) NOT NULL,
  status enum('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX orders_user_id_idx (user_id)
) ENGINE=InnoDB;

INSERT INTO users (email, display_name) VALUES ('alice@example.test', 'Alice'), ('bob@example.test', 'Bob');
INSERT INTO products (name, price, attributes) VALUES ('Keyboard', 99.90, '{"color":"green"}'), ('Mouse', 39.50, '{"wireless":true}');
INSERT INTO orders (user_id, total, status) VALUES (1, 99.90, 'paid'), (2, 39.50, 'pending');
