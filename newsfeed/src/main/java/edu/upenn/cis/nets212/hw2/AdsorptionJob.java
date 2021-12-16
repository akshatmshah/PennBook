package edu.upenn.cis.nets212.hw2;


import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.LinkedList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import org.apache.livy.Job;
import org.apache.livy.JobContext;
import org.apache.spark.api.java.JavaPairRDD;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.sql.SparkSession;

import edu.upenn.cis.nets212.config.Config;
import edu.upenn.cis.nets212.storage.SparkConnector;
import scala.Tuple2;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.spark.api.java.JavaPairRDD;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.api.java.function.PairFunction;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.catalyst.expressions.GenericRowWithSchema;
import org.apache.spark.sql.types.StructType;

import com.amazonaws.services.dynamodbv2.document.BatchWriteItemOutcome;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.TableWriteItems;
import com.amazonaws.services.dynamodbv2.document.UpdateItemOutcome;
import com.amazonaws.services.dynamodbv2.document.spec.UpdateItemSpec;
import com.amazonaws.services.dynamodbv2.document.utils.ValueMap;
import com.amazonaws.services.dynamodbv2.local.shared.model.WriteRequest;
import com.amazonaws.services.dynamodbv2.model.AttributeDefinition;
import com.amazonaws.services.dynamodbv2.model.KeySchemaElement;
import com.amazonaws.services.dynamodbv2.model.KeyType;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughput;
import com.amazonaws.services.dynamodbv2.model.ResourceInUseException;
import com.amazonaws.services.dynamodbv2.model.ReturnValue;
import com.amazonaws.services.dynamodbv2.model.ScalarAttributeType;
import com.amazonaws.services.dynamodbv2.model.Stream;
import com.opencsv.CSVParser;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;
import java.text.ParseException;
import com.amazonaws.services.dynamodbv2.document.ScanOutcome;


import edu.upenn.cis.nets212.config.Config;
import edu.upenn.cis.nets212.storage.DynamoConnector;
import edu.upenn.cis.nets212.storage.SparkConnector;
import scala.Tuple2;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;


import com.amazonaws.services.dynamodbv2.document.ItemCollection;
import com.amazonaws.services.dynamodbv2.document.QueryOutcome;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.spec.QuerySpec;

import java.text.DateFormat;  
import java.text.SimpleDateFormat;  
import java.util.Date;  
import java.util.Calendar;  

/**This file defines the Adsorption algorithm that will be used to make recommendations to the users of PennBook.
 * 
 * 
 * **/
public class AdsorptionJob implements Job<List<Integer>> {
	private static final long serialVersionUID = 1L;
	
	/**
	 * Connection to Apache Spark
	 */
	SparkSession spark;
	
	JavaSparkContext context;
	static double d_Max;
	static int i_Max;
	static boolean toDebug;
	DynamoDB db;
	Set <Item> setItems = new HashSet<Item>();
	
	public AdsorptionJob() {
		System.setProperty("file.encoding", "UTF-8");
	}

	/**
	 * Initialize the database connection and open the file
	 * 
	 * @throws IOException
	 * @throws InterruptedException 
	 */
	public void initialize() throws IOException, InterruptedException {
		
		System.out.println("Connecting to Spark...");
		db = DynamoConnector.getConnection(Config.DYNAMODB_URL);
		spark = SparkConnector.getSparkConnection();
		context = SparkConnector.getSparkContext();
	
		System.out.println("Connected!");
	}
	

	/**
	 * Depending on the tablename provided, returns an arraylist of Tuple2 with the pairs of two attributes in a Tuple2.
	 * I use this function to collect item info from these table names in a more serializable form then just returning an 
	 * ArrayList of items
	 * 
	 * */
	
	public ArrayList<Tuple2<String, String>> collectionToArrayList(String tableName){
		DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
		ArrayList<Tuple2<String, String>> itemList = new ArrayList<Tuple2<String, String>>();
		Table table;
		if(tableName.equals("articleURL") || tableName.equals("articleDate")) {
			table = db.getTable("articles");
			
		}
		else {
			
			table = db.getTable(tableName);
		}
	
		ItemCollection <ScanOutcome> items = table.scan();
	
	
		try {
            Iterator<Item> iter = items.iterator();
            while (iter.hasNext()) {
            
            	Item item = iter.next();


            	if(tableName.equals("articles")){
            		
            		if (dateFormat.parse(item.getString("date")).before(new Date()) ||
	    		dateFormat.parse(item.getString("date")).equals(new Date())){
            			
            		Tuple2<String, String> tup = new Tuple2<String, String>(String.valueOf(item.getInt("articleID")), item.getString("category"));
            		itemList.add(tup);
            	}



            	}
            	else if(tableName.equals("interests")){
            		
            		Tuple2<String, String> tup = new Tuple2<String, String>(item.getString("username"), item.getString("interest"));
            		itemList.add(tup);
            	}
            	else if(tableName.equals("friends")){
            	
            		Tuple2<String, String> tup = new Tuple2<String, String>(item.getString("username"), item.getString("friendname"));
            		itemList.add(tup);



            	}
            	else if(tableName.equals("articleLikes")){
            		
    				Tuple2<String, String> tup = new Tuple2<String, String>(String.valueOf(item.getInt("articleID")), item.getString("username"));
            		itemList.add(tup);

            	}
            	
            	else if(tableName.equals("articleURL")) {
            	
            		Tuple2<String, String> tup = new Tuple2<String, String>(String.valueOf(item.getInt("articleID")), item.getString("url"));
            		itemList.add(tup);
            		
            	}else if(tableName.equals("articleDate")) {
            	
            		Tuple2<String, String> tup = new Tuple2<String, String>(String.valueOf(item.getInt("articleID")), item.getString("date"));
            		itemList.add(tup);
            		
            	}
            	else if(tableName.equals("userArticleScores")) {
            		Tuple2<String, String> tup = new Tuple2<String, String>(item.getString("username"), String.valueOf(item.getInt("articleID")));
            		itemList.add(tup);
            		
            	}
            	
            }
        } catch (Exception e) {
            System.err.println("Unable to scan table:" + tableName);
            e.printStackTrace();
        }
        return itemList;
	}
	
	/**Checks if the input string is a valid integer.
	 * **/
	public static boolean isNumeric(String strNum) {
	    if (strNum == null) {
	        return false;
	    }
	    try {
	       Integer d = Integer.parseInt(strNum);
	    } catch (NumberFormatException nfe) {
	        return false;
	    }
	    return true;
	}
	/**Takes in attributes of an item in the userArticleScores table. Returns a item with the specified attributes
	 * 
	 * 
	 * **/
	public Item produceItem(String username, int articleId, double score, String url, String date) {
	
		Item item = new Item()
		.withPrimaryKey("username",(String) username, "articleID", articleId)
		.withDouble("score", score)
		.withString("url", url)
		.withString("date", date);
		
		return item;
		
	}
	
	/**Updates the item in the userArticleScores table with the specified username and articleID.
	 * Provides the item with this newScore parameter
	 * **/
	public void updateItem(String username, int articleID, double newScore) {
		Table table = db.getTable("userArticleScores");
		UpdateItemSpec updateItemSpec = new UpdateItemSpec().withPrimaryKey("username", username, "articleID", articleID)
	            .withUpdateExpression("set score=:a")
	            .withValueMap(new ValueMap().withNumber(":a", newScore))
	            .withReturnValues(ReturnValue.UPDATED_NEW);
		try {
            System.out.println("Updating the item...");
            UpdateItemOutcome outcome = table.updateItem(updateItemSpec);
            System.out.println("UpdateItem succeeded:\n" + outcome.getItem().toJSONPretty());

        }
        catch (Exception e) {
            System.err.println("Unable to update item with this username:" + username + "and article " + articleID);
            System.err.println(e.getMessage());
        }
	}

	/**Fucntion that holds the bulk of the adsorption algorithm logic by using other functions a helpers. Nothing is returned.
	 * The userArticleScores table is just updated correclty at every call
	 * 
	 * 
	 * **/


	public void buildGraph(){
		  DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
		  //RDD holding the keys of the items currently in the userArticleScores table
		  JavaPairRDD <Tuple2<String, String>, Double> original = context.parallelize(collectionToArrayList("userArticleScores"))
				  .mapToPair(item -> new Tuple2<Tuple2<String, String>, Double>(new Tuple2<String,String>(item._1, item._2), 0.0));
		
		//This block gets article -> category relationships into scalable RDDS only for articles before or at current date
		ArrayList<Tuple2<String, String>> articleItems = collectionToArrayList("articles");
		JavaRDD<Tuple2<String, String>> articleItemRDD = context.parallelize(articleItems);
		JavaPairRDD<String, String> articleToCategory = articleItemRDD.mapToPair(item ->  new Tuple2<String, String>(item._1, item._2));
		JavaPairRDD<String, String> categoryToArticle = articleItemRDD.mapToPair(item ->  new Tuple2<String, String>(item._2, item._1));
		
		//This block gets user -> category relationships into scalable RDDS
		ArrayList<Tuple2<String, String>> interestItems = collectionToArrayList("interests");
		JavaRDD<Tuple2<String, String>> interestItemRDD = context.parallelize(interestItems);
		JavaPairRDD<String, String> userToCategory = interestItemRDD.mapToPair(item ->  new Tuple2<String, String>(item._1, item._2));
		JavaPairRDD<String, String> categoryToUser = interestItemRDD.mapToPair(item ->  new Tuple2<String, String>(item._2, item._1));

		
		//Addressing categories that have no one interested in them
		JavaPairRDD<String, String> boringCategories = categoryToArticle.subtractByKey(categoryToUser);
		categoryToArticle = categoryToArticle.subtractByKey(boringCategories);
		
		//This block gets user -> user relationships into scalable RDDS
		ArrayList<Tuple2<String, String>>  friendItems = collectionToArrayList("friends");
		JavaRDD<Tuple2<String, String>> friendItemRDD = context.parallelize(friendItems);
		JavaPairRDD<String, String> friendships = friendItemRDD.mapToPair(item ->  new Tuple2<String, String>(item._1, item._2));
		
		//This block gets article -> user relationships into scalable RDDS
		ArrayList<Tuple2<String, String>> articleLikesItems = collectionToArrayList("articleLikes");
		JavaRDD<Tuple2<String, String>> articleLikesItemRDD = context.parallelize(articleLikesItems);
		JavaPairRDD<String, String> articleToUser = articleLikesItemRDD.mapToPair(item ->  new Tuple2<String, String>(item._1, item._2));
		JavaPairRDD<String, String> userToArticle = articleItemRDD.mapToPair(item ->  new Tuple2<String, String>(item._2, item._1));
		
		//This block gets articleID -> url relationships into scalable RDDS
		ArrayList<Tuple2<String, String>> articleURLS = collectionToArrayList("articleURL");
		JavaRDD<Tuple2<String, String>> articleURLsRDD = context.parallelize(articleURLS);
		JavaPairRDD<String, String> articleToURL = articleURLsRDD.mapToPair(item ->  new Tuple2<String, String>(item._1, item._2));
		System.out.println("Article URL printed");
		
		//This block gets articleID -> date relationships into scalable RDDS
		ArrayList<Tuple2<String, String>> articleDate = collectionToArrayList("articleDate");
		JavaRDD<Tuple2<String, String>> articleDateRDD = context.parallelize(articleDate);
		JavaPairRDD<String, String> articleToDate = articleDateRDD.mapToPair(item ->  new Tuple2<String, String>(item._1, item._2));
		
		
		
		
	    JavaPairRDD<String, String> userOutEdges = friendships.union(userToArticle).union(userToCategory);
	    
	    //These node transfrer RDDs show the specified distribution of weight across each type of graph edge
	    JavaPairRDD <String, Double> userFriendsNodeTransfer = friendships.mapToPair(item -> new Tuple2<String, Double>(item._1, 1.0))
	    		.reduceByKey((a, b) -> a + b)
	    		.mapToPair(item -> new Tuple2<String, Double>(item._1, 0.3 / item._2));
	    
	    JavaPairRDD <String, Double> userCategoryNodeTransfer = userToCategory.mapToPair(item -> new Tuple2<String, Double>(item._1, 1.0))
	    		.reduceByKey((a, b) -> a + b)
	    		.mapToPair(item -> new Tuple2<String, Double>(item._1, 0.3 / item._2));
	    
	    JavaPairRDD <String, Double> userArticleNodeTransfer = userToArticle.mapToPair(item -> new Tuple2<String, Double>(item._1, 1.0))
	    		.reduceByKey((a, b) -> a + b)
	    		.mapToPair(item -> new Tuple2<String, Double>(item._1, 0.5 / item._2));
	    
	    JavaPairRDD<String, Double> categoryArticleNodeTransfer = categoryToArticle.mapToPair(item -> new Tuple2<String, Double>(item._1, 1.0))
	    		.reduceByKey((a, b) -> a + b)
	    		.mapToPair(item -> new Tuple2<String, Double>(item._1, 0.5 / item._2));
	   categoryArticleNodeTransfer = categoryArticleNodeTransfer.union(boringCategories.mapToPair(item -> new Tuple2<String, Double>(item._1, 1.0))
	    		.reduceByKey((a, b) -> a + b)
	    		.mapToPair(item -> new Tuple2<String, Double>(item._1, 1 / item._2)));
	    
	    JavaPairRDD<String, Double> categoryUserNodeTransfer = categoryToUser.mapToPair(item -> new Tuple2<String, Double>(item._1, 1.0))
	    		.reduceByKey((a, b) -> a + b)
	    		.mapToPair(item -> new Tuple2<String, Double>(item._1, 0.5 / item._2));
	    
	    JavaPairRDD<String, Double> articleNodeTransfer = articleToCategory.union(articleToUser).mapToPair(item -> new Tuple2<String, Double>(item._1, 1.0))
	    		.reduceByKey((a, b) -> a + b)
	    		.mapToPair(item -> new Tuple2<String, Double>(item._1, 1.0 / item._2));
	    
	    
	    //EdgeTransfer RDDS Format <String sourceNodeName, <destinationNodeName, edgeWeight>
		System.out.println("Begin edge Transfer");
	    JavaPairRDD<String, Tuple2<String, Double>> articleToCategoryEdgeTransfer = articleToCategory.join(articleNodeTransfer);
	    
	    JavaPairRDD<String, Tuple2<String, Double>> articleToUserEdgeTransfer = articleToUser.join(articleNodeTransfer);
	    JavaPairRDD<String, Tuple2<String, Double>> userToArticleEdgeTransfer = userToArticle.join(userArticleNodeTransfer);
	    JavaPairRDD<String, Tuple2<String, Double>> userToUserEdgeTransfer = friendships.join(userFriendsNodeTransfer);
	    JavaPairRDD<String, Tuple2<String, Double>> userToCategoryEdgeTransfer = userToCategory.join(userCategoryNodeTransfer);
	    JavaPairRDD<String, Tuple2<String, Double>> categoryToUserEdgeTransfer = categoryToUser.join(categoryUserNodeTransfer);
	    JavaPairRDD<String, Tuple2<String, Double>> categoryToArticleEdgeTransfer = categoryToArticle.join(categoryArticleNodeTransfer);
	    
	    JavaPairRDD<String, Tuple2<String, Double>> edgeTransferRDD = articleToCategoryEdgeTransfer.union(articleToUserEdgeTransfer)
	    		.union(userToArticleEdgeTransfer)
	    		.union(userToUserEdgeTransfer)
	    		.union(userToCategoryEdgeTransfer)
	    		.union(categoryToUserEdgeTransfer)
	    		.union(categoryToArticleEdgeTransfer);
	    
	    //Arbitray Ranking RDD
	    
	    JavaPairRDD <String, Tuple2<String, Double>> labelWeights = userToCategory.mapToPair(item -> new Tuple2<String, String>(item._1, item._1)).distinct()
	    .join(userToCategory.mapToPair(item -> new Tuple2<String, Double>(item._1, 1.0)).distinct());
	    double d_Max = .15;
	    
		System.out.println("Begin Iterative process");
	    
	    for(int i = 0; i < 15; i++) {
	    	System.out.println("Round" + i);
	    	// <Node Recieving labels , < Node Label, Label weight * edge weight>>
	    	JavaPairRDD <String, Tuple2<String, Double>> propogateRDD = edgeTransferRDD.join(labelWeights)
	    			.mapToPair(item -> new Tuple2<String, Tuple2<String, Double>>(item._2._1._1, 
	    					new Tuple2<String, Double>(item._2._2._1, item._2._1._2 * item._2._2._2)));
	    
	    	// Want to group by recieving node and Node Label being recieved to add
	    	JavaPairRDD <String, Tuple2<String, Double>> commonLabelSums = propogateRDD.
	    			mapToPair(item -> new Tuple2<Tuple2<String, String>, Double>(new Tuple2<String, String>(item._1, item._2._1), item._2._2))
	    			.reduceByKey((a, b) -> a + b)
	    			.mapToPair(item -> new Tuple2<String, Tuple2<String, Double>>(item._1._1, 
	    					new Tuple2<String, Double>(item._1._2, item._2)));
	    	
	    	
	    	
	    	
	    	//This step allows me to normalize values such that that each node has a sum of weights equal to 1
	    	//by dividing each wieight by the total wieght on the node
	    	 JavaPairRDD <String,Double> sumRecievedWeight = 
	    			 commonLabelSums.reduceByKey((a,b) -> new Tuple2<String, Double>(a._1, a._2 + b._2))
	    			 .mapToPair(item -> new Tuple2<String, Double>(item._1, item._2._2));
	    	 
	    	 JavaPairRDD <String, Tuple2<String, Double>> normalized = commonLabelSums.join(sumRecievedWeight).
	    			 mapToPair(item -> new Tuple2<String, Tuple2<String, Double>>(item._1, new Tuple2<String, Double>(item._2._1._1, item._2._1._2 / item._2._2)));
	    		
	    	 JavaPairRDD<Tuple2<String, String>, Double> normalizedSplit = normalized
	    			 .mapToPair(item -> new Tuple2<Tuple2<String, String>, Double>(new Tuple2<String, String>(item._1, item._2._1), item._2._2));
	    	 JavaPairRDD<Tuple2<String, String>, Double> labelWeightsSplit = labelWeights
	    			 .mapToPair(item -> new Tuple2<Tuple2<String, String>, Double>(new Tuple2<String, String>(item._1, item._2._1), item._2._2));
	    	 
	    	
	    	 
	    	 //This section allows me to compar the results from the previous iteration 
	    	 //I am checking if any changes of scores are greeater than d_Max. If there are we habe not converged
	    	 JavaPairRDD<Tuple2<String, String>, Double> comparerofCommonKeys = normalizedSplit.join(labelWeightsSplit).
	    			 mapToPair(item -> new Tuple2<Tuple2<String, String>, Double>(item._1, Math.abs(item._2._1 - item._2._2)))
	 				.filter(item -> item._2 > d_Max);
	    	 
	    	 JavaPairRDD<Tuple2<String, String>, Double> uniquetoNormalized = 
	    			 normalizedSplit.subtractByKey(labelWeightsSplit)
	    			 .filter(item -> item._2 > d_Max);
	    	 
	    	 JavaPairRDD<Tuple2<String, String>, Double> uniquetoFormer = 
	    			 labelWeightsSplit.subtractByKey(normalizedSplit)
	    			 .filter(item -> item._2 > d_Max);
	    	 
	    	 labelWeights = normalized;
	    	

	    	 
	    	 if(comparerofCommonKeys.union(uniquetoNormalized).union(uniquetoFormer).count() == 0 ) {
	    		 break;
	    	 }


	    }

	    JavaPairRDD <Tuple2<String, String>, Double> labelChecker = labelWeights.mapToPair(item -> new Tuple2<Tuple2<String, String>, Double>(new Tuple2<String,String>(item._1, item._2._1), item._2._2));
	    JavaPairRDD <Tuple2<String, String>, Double> newWeights = labelChecker.subtractByKey(original);
	    JavaPairRDD <Tuple2<String, String>, Double> oldWeights = labelChecker.subtractByKey(newWeights);
	    
	    //Make labelWeights only contain articleID username pairings that were in the table before algorithm began
	    labelWeights = oldWeights.
	    		mapToPair(item -> new Tuple2<String, Tuple2<String, Double>>(item._1._1, new Tuple2<String, Double>(item._1._2, item._2)));
	    //Make babyWeights only contain articleID username pairings that were not in the table before algorithm began
	    JavaPairRDD <String, Tuple2<String, Double>> babyWeights = newWeights
	    		.mapToPair(item -> new Tuple2<String, Tuple2<String, Double>>(item._1._1, new Tuple2<String, Double>(item._1._2, item._2)));
	    //Filter down to pairings of scores of magnitude greater than .0001 and add url and date info
	    labelWeights = labelWeights.filter(item -> item._2._2 > .0001);
	   JavaPairRDD <String, Tuple2<Tuple2<String, Double>, Tuple2<String, String>>> articleLabelWeights = labelWeights.filter(item -> isNumeric(item._1))
			   .join(articleToURL.join(articleToDate));
	    
	    System.out.println("Writing to userArticleScores");

	    //Update the items that are already in the userArticleScores table
	    articleLabelWeights.collect().stream().forEach(structure -> {
	    	updateItem(structure._2._1._1, Integer.parseInt(structure._1), structure._2._1._2);
	    	
				
		});
	    //Write all the new  items to the userArticleScores table
	    babyWeights.filter(item -> isNumeric(item._1))
		   .join(articleToURL.join(articleToDate)).collect().stream().forEach(structure -> {
			
	    	Item item = produceItem(structure._2._1._1, Integer.parseInt(structure._1), structure._2._1._2, structure._2._2._1, structure._2._2._2 );
	    	setItems.add(item);
	    	
	    	if(setItems.size() >= 1 && (setItems.size() == 25)) {
	    		TableWriteItems data;
	    						
				data = new TableWriteItems("userArticleScores").withItemsToPut(setItems);
				BatchWriteItemOutcome  outcome = db.batchWriteItem(data);
							
				Map<String, List<com.amazonaws.services.dynamodbv2.model.WriteRequest>> unprocessedItems = outcome.getUnprocessedItems();
				if (!outcome.getUnprocessedItems().isEmpty()) {
				                 
					outcome = db.batchWriteItemUnprocessed(unprocessedItems);
				 }
				  setItems.clear();
				}
				
		});
	    
	 
	 
		
	 
	      
	    TableWriteItems data;
	    data = new TableWriteItems("userArticleScores").withItemsToPut(setItems);
	    BatchWriteItemOutcome outcome = db.batchWriteItem(data);
	    Map<String, List<com.amazonaws.services.dynamodbv2.model.WriteRequest>> unprocessedItems = outcome.getUnprocessedItems();
		if (!outcome.getUnprocessedItems().isEmpty()) {
		                 
			outcome = db.batchWriteItemUnprocessed(unprocessedItems);
		 }
	    

	}

	
	


	/**
	 * Main functionality in the program: read and process tadsorption graph
	 * 
	 * @throws IOException File read, network, and other errors
	 * @throws InterruptedException User presses Ctrl-C
	 */
	public List<Integer> run() throws IOException, InterruptedException {
		
		System.out.println("Running");
		buildGraph();
	
		System.out.println("*** Finished article ranking! ***");
		List<Integer> list = new LinkedList<Integer>();
		return list;
	}


	/**
	 * Graceful shutdown
	 */
	
	public void shutdown() {
		System.out.println("Shutting down");

		if (spark != null)
			spark.close();
	}

	@Override
	public List<Integer> call(JobContext arg0) throws Exception {
		initialize();
		return run();
	}

}
