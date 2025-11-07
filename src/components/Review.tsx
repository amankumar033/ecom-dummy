"use client"
import { useState } from 'react';
import Image from 'next/image';

const Reviews = () => {
  const reviews = [
    {
      id: 1,
      name: 'John Smith',
      image: '/face.png',
      rating: 5,
      review: 'Excellent service! The parts arrived quickly and were exactly as described. My car runs better than ever now.'
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      image: '/face.png',
      rating: 4,
      review: 'Great quality products at reasonable prices. Will definitely shop here again for my car maintenance needs.'
    },
    {
      id: 3,
      name: 'Michael Brown',
      image: '/face.png',
      rating: 5,
      review: 'The customer support team was very helpful in helping me find the right parts for my vehicle. Highly recommended!'
    },
    {
      id: 4,
      name: 'Emily Davis',
      image: '/face.png',
      rating: 4,
      review: 'Fast shipping and good packaging. The parts fit perfectly and the installation was straightforward.'
    },
    {
      id: 5,
      name: 'David Wilson',
      image: '/face.png',
      rating: 5,
      review: 'I was skeptical at first but these parts exceeded my expectations. My mechanic was impressed with the quality too.'
    },
    {
      id: 6,
      name: 'Jessica Lee',
      image: '/customers/jessica.jpg',
      rating: 4,
      review: 'Good selection of parts and easy to navigate website. The delivery was faster than I expected.'
    },
    {
      id: 7,
      name: 'Robert Taylor',
      image: '/customers/robert.jpg',
      rating: 5,
      review: 'Perfect fit for my car model. The performance improvement was noticeable immediately after installation.'
    },
    {
      id: 8,
      name: 'Amanda Clark',
      image: '/customers/amanda.jpg',
      rating: 4,
      review: 'Very satisfied with my purchase. The parts seem durable and well-made. Will come back for future needs.'
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const cardsPerPage = 4;

  const nextSlide = () => {
    setCurrentIndex(prev => 
      prev + 1 > reviews.length - cardsPerPage ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex(prev => 
      prev - 1 < 0 ? reviews.length - cardsPerPage : prev - 1
    );
  };

  const visibleReviews = reviews.slice(currentIndex, currentIndex + cardsPerPage);

  return (
    <div>
    <div className="container mx-auto py-12 px-2 sm:px-6 lg:px-8 bg-blue-100">
      {/* Heading Section */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Customer Reviews</h2>
        <p className="text-lg font-bold text-gray-600">Excellent 4.91 based on 225,181 reviews</p>
      </div>

      {/* Reviews Carousel */}
      <div className="relative">
        {/* Navigation Arrows */}
        <button 
          onClick={prevSlide}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10  p-2 rounded-full  hover:bg-gray-100 transition-colors"
          aria-label="Previous reviews"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button 
          onClick={nextSlide}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10  p-2 rounded-full  hover:bg-gray-100 transition-colors"
          aria-label="Next reviews"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Review Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 px-10">
          {visibleReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              {/* Customer Info */}
              <div className="flex items-center mb-4">
                <div className="relative h-12 w-12 rounded-full overflow-hidden mr-4">
                  <Image
                    src={review.image}
                    alt={review.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{review.name}</h3>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(Number(review.rating) || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Review Text */}
              <div className="text-gray-600">
                <p className="italic">"{review.review}"</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
      <div className='py-10 bg-white px-10'>
<img src="/advertisement.png" alt="" />
    </div>
    </div>
  );
};

export default Reviews;