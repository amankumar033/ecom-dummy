"use client";
import React, { useState, useEffect } from 'react';
import DescriptionDropdown from '@/components/DescriptionDropdown';

const TestPage = () => {
  const [productData, setProductData] = useState<any>(null);
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);

  const sampleHtmlContent = `
    <h2>Product Features</h2>
    <p>This is a <strong>high-quality product</strong> with amazing features:</p>
    <ul>
      <li><em>Premium quality materials</em></li>
      <li>Durable construction</li>
      <li>Easy to maintain</li>
    </ul>
    <h3>Technical Specifications</h3>
    <p>Here are the key specifications:</p>
    <ul>
      <li>Weight: <strong>2.5 kg</strong></li>
      <li>Dimensions: 10" x 8" x 4"</li>
      <li>Material: <u>Stainless Steel</u></li>
    </ul>
    <blockquote>
      "This product exceeds all expectations and provides excellent value for money."
    </blockquote>
    <p>For more information, visit our <a href="#" style="color: #2563eb;">product page</a>.</p>
  `;

  // Fetch a real product from the database
  const fetchProductData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products/1'); // Fetch first product
      const data = await response.json();
      setProductData(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch debug data
  const fetchDebugData = async () => {
    setDebugLoading(true);
    try {
      const response = await fetch('/api/debug/description');
      const data = await response.json();
      setDebugData(data);
    } catch (error) {
      console.error('Error fetching debug data:', error);
    } finally {
      setDebugLoading(false);
    }
  };

  useEffect(() => {
    fetchProductData();
    fetchDebugData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-black mb-8">Description Dropdown Test</h1>
        
        <div className="space-y-6">
          {/* Test with HTML content */}
          <div>
            <h2 className="text-xl font-semibold text-black mb-4">With HTML Content</h2>
            <DescriptionDropdown
              title="Product Description"
              content={sampleHtmlContent}
              defaultOpen={true}
            />
          </div>

          {/* Test with real database content */}
          <div>
            <h2 className="text-xl font-semibold text-black mb-4">Real Database Content</h2>
            {loading ? (
              <p>Loading product data...</p>
            ) : productData ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="font-semibold mb-2">Raw Description Data:</h3>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-40">
                    {JSON.stringify(productData.description, null, 2)}
                  </pre>
                </div>
                
                <DescriptionDropdown
                  title="Database Description"
                  content={productData.description}
                  defaultOpen={true}
                />
              </div>
            ) : (
              <p>No product data available</p>
            )}
          </div>

          {/* Debug Data Section */}
          <div>
            <h2 className="text-xl font-semibold text-black mb-4">Debug Data</h2>
            {debugLoading ? (
              <p>Loading debug data...</p>
            ) : debugData ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="font-semibold mb-2">Sample Products from Database:</h3>
                  <div className="space-y-2">
                    {debugData.data.descriptionLengths.map((product: any, index: number) => (
                      <div key={index} className="border-b pb-2">
                        <p><strong>Product {product.product_id}:</strong> {product.name}</p>
                        <p><strong>Description Length:</strong> {product.descriptionLength}</p>
                        <p><strong>Preview:</strong> {product.descriptionPreview}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="font-semibold mb-2">Test HTML Content:</h3>
                  <DescriptionDropdown
                    title="Test HTML"
                    content={debugData.data.testHtmlContent}
                    defaultOpen={true}
                  />
                </div>
              </div>
            ) : (
              <p>No debug data available</p>
            )}
          </div>

          {/* Test with demo mode */}
          <div>
            <h2 className="text-xl font-semibold text-black mb-4">Demo Mode (No Content)</h2>
            <DescriptionDropdown
              title="Service Description"
              content=""
              demoMode={true}
              defaultOpen={false}
            />
          </div>

          {/* Test with empty content */}
          <div>
            <h2 className="text-xl font-semibold text-black mb-4">Empty Content</h2>
            <DescriptionDropdown
              title="Empty Description"
              content=""
              defaultOpen={false}
            />
          </div>

          {/* Test with plain text */}
          <div>
            <h2 className="text-xl font-semibold text-black mb-4">Plain Text</h2>
            <DescriptionDropdown
              title="Simple Description"
              content="This is a simple plain text description without any HTML formatting."
              defaultOpen={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage; 