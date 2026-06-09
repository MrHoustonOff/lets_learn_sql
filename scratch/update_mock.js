const fs = require('fs');
const path = require('path');

const mockPath = path.join(__dirname, '../frontend/src/modules/db-visualizer/mock/northwind.json');
const data = JSON.parse(fs.readFileSync(mockPath, 'utf8'));

// 1:1 relation (customer_profiles)
data.tables.push({
  name: "customer_profiles",
  schema: "public",
  columns: [
    { name: "customer_id", type: "varchar(5)", nullable: false, default: null, isPrimaryKey: true, isForeignKey: true, isUnique: true },
    { name: "bio", type: "text", nullable: true, default: null, isPrimaryKey: false, isForeignKey: false, isUnique: false }
  ],
  indexes: [
    { name: "pk_cust_profiles", definition: "PRIMARY KEY (customer_id)", isPrimary: true, isUnique: true }
  ],
  foreignKeys: [
    { name: "fk_profile_customer", column: "customer_id", targetTable: "customers", targetColumn: "customer_id", onDelete: "CASCADE", onUpdate: "CASCADE" }
  ],
  referencedBy: [],
  sequences: []
});

// Update customers referencedBy
const customers = data.tables.find(t => t.name === 'customers');
customers.referencedBy.push({ table: "customer_profiles", column: "customer_id", constraint: "fk_profile_customer" });

// M:M relation (employees, territories, employee_territories)
data.tables.push({
  name: "employees",
  schema: "public",
  columns: [
    { name: "employee_id", type: "integer", nullable: false, default: null, isPrimaryKey: true, isForeignKey: false, isUnique: true },
    { name: "last_name", type: "varchar(20)", nullable: false, default: null, isPrimaryKey: false, isForeignKey: false, isUnique: false }
  ],
  indexes: [
    { name: "pk_employees", definition: "PRIMARY KEY (employee_id)", isPrimary: true, isUnique: true }
  ],
  foreignKeys: [],
  referencedBy: [
    { table: "employee_territories", column: "employee_id", constraint: "fk_et_employee" }
  ],
  sequences: []
});

data.tables.push({
  name: "territories",
  schema: "public",
  columns: [
    { name: "territory_id", type: "varchar(20)", nullable: false, default: null, isPrimaryKey: true, isForeignKey: false, isUnique: true },
    { name: "territory_desc", type: "char(50)", nullable: false, default: null, isPrimaryKey: false, isForeignKey: false, isUnique: false }
  ],
  indexes: [
    { name: "pk_territories", definition: "PRIMARY KEY (territory_id)", isPrimary: true, isUnique: true }
  ],
  foreignKeys: [],
  referencedBy: [
    { table: "employee_territories", column: "territory_id", constraint: "fk_et_territory" }
  ],
  sequences: []
});

data.tables.push({
  name: "employee_territories",
  schema: "public",
  columns: [
    { name: "employee_id", type: "integer", nullable: false, default: null, isPrimaryKey: true, isForeignKey: true, isUnique: false },
    { name: "territory_id", type: "varchar(20)", nullable: false, default: null, isPrimaryKey: true, isForeignKey: true, isUnique: false }
  ],
  indexes: [
    { name: "pk_employee_territories", definition: "PRIMARY KEY (employee_id, territory_id)", isPrimary: true, isUnique: true }
  ],
  foreignKeys: [
    { name: "fk_et_employee", column: "employee_id", targetTable: "employees", targetColumn: "employee_id", onDelete: "NO ACTION", onUpdate: "NO ACTION" },
    { name: "fk_et_territory", column: "territory_id", targetTable: "territories", targetColumn: "territory_id", onDelete: "NO ACTION", onUpdate: "NO ACTION" }
  ],
  referencedBy: [],
  sequences: []
});

fs.writeFileSync(mockPath, JSON.stringify(data, null, 2));
console.log("Mock updated!");
