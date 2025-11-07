/*
  Script: Generate WEBSITE_DATA.md
  Description: Fetches categories and products directly from the database and writes a comprehensive
  Markdown document summarizing the website data. All prices are formatted in Indian Rupees (₹).
*/

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function getPoolConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'e_com_web',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 5,
    charset: 'utf8mb4',
    multipleStatements: false,
  };
}

let pool;
async function getPool() {
  if (!pool) {
    pool = mysql.createPool(getPoolConfig());
  }
  return pool;
}

async function query(sql, params) {
  const p = await getPool();
  const [rows] = await p.query(sql, params);
  return rows;
}

async function closePool() {
  if (pool) {
    try { await pool.end(); } catch {}
  }
}

function formatRupees(amount) {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  }
}

async function fetchCategories(db) {
  const sql = `
    SELECT category_id, name, slug, is_active
    FROM e_com_web.categories
    WHERE is_active = 1
    ORDER BY name ASC
  `;
  return db.query(sql);
}

async function fetchProducts(db) {
  const sql = `
    SELECT 
      p.product_id,
      p.name,
      p.slug,
      p.features,
      p.sale_price,
      p.original_price,
      p.rating,
      p.image_1,
      p.category_id,
      p.sub_category_id,
      p.brand_id,
      p.sub_brand_id,
      p.stock_quantity,
      p.is_active,
      p.is_featured,
      p.is_hot_deal,
      p.created_at,
      p.updated_at,
      p.dealer_id,
      COALESCE(c.name, CONCAT('Category ', p.category_id)) as category_name,
      c.slug as category_slug,
      COALESCE(sc.name, CONCAT('Sub-category ', p.sub_category_id)) as subcategory_name,
      sc.slug as subcategory_slug,
      COALESCE(b.brand_name, CONCAT('Brand ', p.brand_id)) as brand_name,
      COALESCE(sb.sub_brand_name, CONCAT('Sub-brand ', p.sub_brand_id)) as sub_brand_name
    FROM e_com_web.products p
    LEFT JOIN e_com_web.categories c ON p.category_id = c.category_id
    LEFT JOIN e_com_web.sub_categories sc ON p.sub_category_id = sc.sub_category_id
    LEFT JOIN e_com_web.brands b ON p.brand_id = b.brand_id
    LEFT JOIN e_com_web.sub_brands sb ON p.sub_brand_id = sb.sub_brand_id
    WHERE p.is_active = 1
    ORDER BY p.created_at DESC
  `;
  return db.query(sql);
}

function buildMarkdown({ categories, products }) {
  const siteTitle = 'Website Data Overview';
  const now = new Date().toISOString();

  const categoryIdToCategory = new Map();
  categories.forEach((c) => categoryIdToCategory.set(c.category_id, c));

  const productsByCategoryId = new Map();
  products.forEach((p) => {
    const list = productsByCategoryId.get(p.category_id) || [];
    list.push(p);
    productsByCategoryId.set(p.category_id, list);
  });

  let md = '';
  md += `## ${siteTitle}\n\n`;
  md += `- **Generated at**: ${now}\n`;
  md += `- **Total categories**: ${categories.length}\n`;
  md += `- **Total products**: ${products.length}\n\n`;

  md += `### Categories\n\n`;
  categories.forEach((c) => {
    const inCat = productsByCategoryId.get(c.category_id) || [];
    md += `- **${c.name}** (slug: \`${c.slug}\`) — ${inCat.length} product(s)\n`;
  });
  md += `\n`;

  md += `### Products by Category\n\n`;
  categories.forEach((c) => {
    const inCat = (productsByCategoryId.get(c.category_id) || []).sort((a, b) => a.name.localeCompare(b.name));
    md += `#### ${c.name}\n\n`;
    if (inCat.length === 0) {
      md += `No products in this category.\n\n`;
      return;
    }
    inCat.forEach((p) => {
      const price = formatRupees(p.sale_price);
      const mrp = p.original_price ? formatRupees(p.original_price) : null;
      const rating = p.rating != null ? Number(p.rating).toFixed(1) : 'N/A';
      md += `- **${p.name}** (slug: \`${p.slug}\`)\n`;
      md += `  - **Price**: ${price}${mrp ? ` (MRP: ${mrp})` : ''}\n`;
      md += `  - **Brand**: ${p.brand_name || 'N/A'}${p.sub_brand_name ? ` → ${p.sub_brand_name}` : ''}\n`;
      md += `  - **Stock**: ${p.stock_quantity != null ? p.stock_quantity : 'N/A'}\n`;
      md += `  - **Rating**: ${rating}\n`;
      md += `  - **Features**: ${p.features ? String(p.features).replace(/\s+/g, ' ').slice(0, 300) : 'N/A'}\n`;
    });
    md += `\n`;
  });

  return md;
}

async function main() {
  const db = { query };
  try {
    console.log('Fetching categories and products from database...');
    const [categories, products] = await Promise.all([
      fetchCategories(db),
      fetchProducts(db),
    ]);

    const markdown = buildMarkdown({ categories, products });
    const outPath = path.resolve(__dirname, '../WEBSITE_DATA.md');
    fs.writeFileSync(outPath, markdown, 'utf8');
    console.log(`✅ WEBSITE_DATA.md generated at: ${outPath}`);
  } catch (err) {
    console.error('❌ Failed to generate WEBSITE_DATA.md:', err);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

main();


