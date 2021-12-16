package edu.upenn.cis.nets212.hw2;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import javax.validation.ValidationException;

import java.io.FileNotFoundException;
import java.io.Reader;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.spark.api.java.JavaPairRDD;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.api.java.function.PairFunction;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import java.lang.reflect.InvocationTargetException;



import com.amazonaws.services.dynamodbv2.document.BatchWriteItemOutcome;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;

import com.amazonaws.services.dynamodbv2.document.PutItemOutcome;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.TableWriteItems;
import com.amazonaws.services.dynamodbv2.local.shared.model.WriteRequest;
import com.amazonaws.services.dynamodbv2.model.AttributeDefinition;
import com.amazonaws.services.dynamodbv2.model.KeySchemaElement;
import com.amazonaws.services.dynamodbv2.model.KeyType;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughput;
import com.amazonaws.services.dynamodbv2.model.ResourceInUseException;
import com.amazonaws.services.dynamodbv2.model.ScalarAttributeType;
//import com.amazonaws.thirdparty.apache.http.ParseException;
import com.opencsv.CSVParser;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvValidationException;

import edu.upenn.cis.nets212.config.Config;
import edu.upenn.cis.nets212.storage.DynamoConnector;
import edu.upenn.cis.nets212.storage.SparkConnector;
import scala.Tuple2;

import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

public class LoadNetwork {
	/**
	 * The basic logger
	 */
	static Logger logger = LogManager.getLogger(LoadNetwork.class);

	/**
	 * Connection to DynamoDB
	 */
	DynamoDB db;
	Table articles;
	
	//CSVParser parser;
	
	
	/**
	 * Connection to Apache Spark
	 */
	SparkSession spark;
	
	JavaSparkContext context;
	
	/**
	 * Helper function: swap key and value in a JavaPairRDD
	 * 
	 * @author zives
	 *
	 */
	static class SwapKeyValue<T1,T2> implements PairFunction<Tuple2<T1,T2>, T2,T1> {

		/**
		 * 
		 */
		private static final long serialVersionUID = 1L;

		@Override
		public Tuple2<T2, T1> call(Tuple2<T1, T2> t) throws Exception {
			return new Tuple2<>(t._2, t._1);
		}
		
	}
	
	
	public LoadNetwork()   {
		System.setProperty("file.encoding", "UTF-8");
		//parser = new CSVParser();
	}
	
	
	

	/**
	 * Initialize the database connection and open the file
	 * 
	 * @throws IOException
	 * @throws InterruptedException 
	 * @throws DynamoDbException 
	 */
	public void initialize() throws IOException, DynamoDbException, InterruptedException {
		logger.info("Connecting to DynamoDB...");
		db = DynamoConnector.getConnection(Config.DYNAMODB_URL);
		
		spark = SparkConnector.getSparkConnection();
		context = SparkConnector.getSparkContext();
		
		logger.debug("Connected!");
	}
	
	//This function makes an Item based on the given json object
	public Item produceItem(JSONObject jsonObject, int id) {
		int futureYear = Integer.parseInt(((String)jsonObject.get("date")).substring(0,4)) + 4;
		String future = String.valueOf(futureYear);
	
		String newDate = future + ((String)jsonObject.get("date")).substring(4,((String)jsonObject.get("date")).length());
		Item item = new Item()
		.withPrimaryKey("url",(String) jsonObject.get("link"), "date",newDate)
		.withInt("articleID", id)
		.withString("headline",(String) jsonObject.get("headline"))
		.withString("category",(String) jsonObject.get("category"))
		.withString("authors", (String) jsonObject.get("authors"))
		.withString("description",(String) jsonObject.get("short_description"));
		
		
		return item;
		
	}
		
		public void jsonReader() {
		    ArrayList<JSONObject> json = new ArrayList<JSONObject>();
		    JSONObject obj;
		    Set <Item> setItems = new HashSet<Item>();
		    Set<Tuple2<String, String>> uniques = new HashSet<Tuple2<String, String>>();
		
		    


		    // This will reference one line at a time
		    String line = null;

		    try {
		        // FileReader reads text files in the default encoding.
		        FileReader fileReader = new FileReader("/home/nets212/G29/news.json");

		        // Always wrap FileReader in BufferedReader.
		        BufferedReader bufferedReader = new BufferedReader(fileReader);
		        int i = 1;
		        while((line = bufferedReader.readLine()) != null && i >= 1) {
		            //obj = (JSONObject) new JSONParser().parse(line);
		        	//try {
		        	i++;
		            json.add((JSONObject) new JSONParser().parse(line));
		            
		        	//}
		        	//catch (ParseException e) {
				        // TODO Auto-generated catch block
				       // e.printStackTrace();
				    //}
		            
		            
		           
		        }
		        // Always close files.
		        bufferedReader.close();         
		    }
		    catch(FileNotFoundException ex) {
		        System.out.println("Unable to open file news.json");                
		    }
		    catch(IOException ex) {
		        System.out.println("Error reading file  + news.json + ");                  
		        // Or we could just do this: 
		        // ex.printStackTrace();
		    } catch (ParseException e) {
		        // TODO Auto-generated catch block
		        e.printStackTrace();
		    }

		    
		    for(int i = 0; i < json.size(); i++){
		    	//System.out.println(json.get(i).get("headline"));
		    	int size = uniques.size();
		    	Item item = produceItem(json.get(i), i+1);
		    	//System.out.println(produceItem(json.get(i)));
		    	uniques.add(new Tuple2<String, String>(item.getString("url"), item.getString("date")));
		    	if(uniques.size() > size) {
		    	setItems.add(item);
		    	}
		    	//try {
		    	if(setItems.size() >= 1 && (setItems.size() == 25 ||  i == json.size() - 1)) {
		    		TableWriteItems data;
		    						
		    		BatchWriteItemOutcome outcome;
		    		
		    		
		    		
									data = new TableWriteItems("articles").withItemsToPut(setItems);
		    						
		    						
									
									
									try {
								
									outcome = db.batchWriteItem(data);
									}
									catch(ValidationException e){
										System.out.println(data);
										outcome = db.batchWriteItem(data);
										
									}
									Map<String, List<com.amazonaws.services.dynamodbv2.model.WriteRequest>> unprocessedItems = outcome.getUnprocessedItems();
									if (!outcome.getUnprocessedItems().isEmpty()) {
					                 
					                    outcome = db.batchWriteItemUnprocessed(unprocessedItems);
					                }
									setItems.clear();
									uniques.clear();
								}
		    	//}
		    	/*catch(InvocationTargetException err) {
					System.out.println("Duplicate HAS BEEN DETECTED");
					continue;
					
				}*/

			

		    }
		}



	
	
	
	/**
	 * Main functionality in the program: read and process the social network
	 * 
	 * @throws IOException File read, network, and other errors
	 * @throws DynamoDbException DynamoDB is unhappy with something
	 * @throws InterruptedException User presses Ctrl-C
	 */
	public void run() throws IOException, DynamoDbException, InterruptedException {
		logger.info("Running");
		jsonReader();

		
	}

	/**
	 * Graceful shutdown
	 */
	public void shutdown() {
		logger.info("Shutting down");
		
		DynamoConnector.shutdown();
		
		if (spark != null)
			spark.close();
	}
	
	public static void main(String[] args) {
		final LoadNetwork ln = new LoadNetwork();

		try {
			ln.initialize();

			ln.run();
		} catch (final IOException ie) {
			logger.error("I/O error: ");
			ie.printStackTrace();
		} catch (final DynamoDbException e) {
			e.printStackTrace();
		} catch (final InterruptedException e) {
			e.printStackTrace();
		} finally {
			ln.shutdown();
		}
	}

}