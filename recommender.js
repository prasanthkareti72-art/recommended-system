// Recommendation Algorithms (Jaccard Index, Cosine Vector Overlap, Weighted Averages)
window.PM_RECOMMENDER = {
  
  // 1. Math Helper: Jaccard Similarity (Content Tag Overlap)
  calculateJaccard: (setA, setB) => {
    const sA = new Set(setA.map(s => s.toLowerCase()));
    const sB = new Set(setB.map(s => s.toLowerCase()));
    
    const intersection = new Set([...sA].filter(x => sB.has(x)));
    const union = new Set([...sA, ...sB]);
    
    if (union.size === 0) return 0;
    return {
      score: intersection.size / union.size,
      intersection: Array.from(intersection),
      union: Array.from(union)
    };
  },

  // 2. Math Helper: Cosine Similarity between rating maps
  calculateCosine: (userA, userB) => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    // Union of all item ratings to compute vector magnitudes
    const keysA = Object.keys(userA);
    const keysB = Object.keys(userB);
    const allKeys = Array.from(new Set([...keysA, ...keysB]));
    
    allKeys.forEach(k => {
      const valA = userA[k] || 0;
      const valB = userB[k] || 0;
      
      dotProduct += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    });
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  },

  // 3. Content-Based Recommendation Algorithm
  getContentRecommendations: (userRatings, datasetItems) => {
    // Collect categories/tags of items rated 3 or above by this user
    const likedCategories = new Set();
    const ratedItemIds = Object.keys(userRatings);
    
    ratedItemIds.forEach(id => {
      const rating = userRatings[id];
      if (rating >= 3) {
        const item = datasetItems.find(i => i.id === id);
        if (item && item.categories) {
          item.categories.forEach(c => likedCategories.add(c));
        }
      }
    });

    const userCategoryVector = Array.from(likedCategories);
    const recommendations = [];

    // Score unrated or low-rated items against user preferred categories
    datasetItems.forEach(item => {
      // Skip if user already rated this item
      if (userRatings[item.id] !== undefined && userRatings[item.id] > 0) return;

      const jaccardResult = window.PM_RECOMMENDER.calculateJaccard(userCategoryVector, item.categories);
      const scorePercentage = Math.round(jaccardResult.score * 100);

      // Construct mathematical explanation
      let explanation = "";
      if (userCategoryVector.length === 0) {
        explanation = "Recommending by default profile tag matching (rate items first to personalize).";
      } else if (jaccardResult.score > 0) {
        explanation = `Matches category tags you like: [${jaccardResult.intersection.join(", ")}]. Overlap Jaccard fraction is ${jaccardResult.intersection.length} / ${jaccardResult.union.length} tags.`;
      } else {
        explanation = `No direct tag overlap, Jaccard index is 0 / ${userCategoryVector.length + item.categories.length}.`;
      }

      recommendations.push({
        id: item.id,
        title: item.title,
        categories: item.categories,
        year: item.year,
        desc: item.desc,
        score: scorePercentage,
        explanation: explanation
      });
    });

    // Sort by similarity score descending
    return recommendations.sort((a, b) => b.score - a.score);
  },

  // 4. User-Based Collaborative Filtering Algorithm
  getCollaborativeRecommendations: (userRatings, datasetUsers, datasetItems) => {
    const similarUsers = [];
    
    // Step 1: Calculate Cosine similarity between target user and all neighbors
    datasetUsers.forEach(neighbor => {
      const sim = window.PM_RECOMMENDER.calculateCosine(userRatings, neighbor.ratings);
      if (sim > 0) {
        similarUsers.push({
          name: neighbor.name,
          similarity: sim,
          ratings: neighbor.ratings
        });
      }
    });

    // Sort neighbors by similarity descending
    similarUsers.sort((a, b) => b.similarity - a.similarity);
    
    // Choose Top 3 neighbors
    const topNeighbors = similarUsers.slice(0, 3);
    const recommendations = [];

    datasetItems.forEach(item => {
      // Skip if user already rated this item
      if (userRatings[item.id] !== undefined && userRatings[item.id] > 0) return;

      let weightedSum = 0;
      let similaritySum = 0;
      const supportingNeighbors = [];

      // Step 2: Predict ratings using weighted average of neighbors
      topNeighbors.forEach(n => {
        const rating = n.ratings[item.id];
        if (rating !== undefined && rating !== null) {
          weightedSum += n.similarity * rating;
          similaritySum += n.similarity;
          supportingNeighbors.push({ name: n.name, rating: rating, sim: Math.round(n.similarity * 100) });
        }
      });

      let scorePercentage = 0;
      let explanation = "";

      if (similaritySum > 0) {
        const predictedRating = weightedSum / similaritySum;
        // Normalize predicted 1-5 rating into 0-100 percentage match
        scorePercentage = Math.round((predictedRating / 5) * 100);
        
        const explanationList = supportingNeighbors.map(sn => `${sn.name} (Rated ${sn.rating}★, Similarity: ${sn.sim}%)`);
        explanation = `Similar users liked this item: ${explanationList.join(", ")}. Weighted rating index predicted at ${predictedRating.toFixed(2)} ★.`;
      } else {
        scorePercentage = 0;
        explanation = "No collaborative overlap: none of your similar neighbors rated this item.";
      }

      recommendations.push({
        id: item.id,
        title: item.title,
        categories: item.categories,
        year: item.year,
        desc: item.desc,
        score: scorePercentage,
        explanation: explanation
      });
    });

    return recommendations.sort((a, b) => b.score - a.score);
  }
};
