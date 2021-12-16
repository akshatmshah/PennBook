package edu.upenn.cis.nets212.hw2;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.amazonaws.services.dynamodbv2.document.BatchWriteItemOutcome;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.PutItemOutcome;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.TableWriteItems;
import com.amazonaws.services.dynamodbv2.model.AttributeDefinition;
import com.amazonaws.services.dynamodbv2.model.KeySchemaElement;
import com.amazonaws.services.dynamodbv2.model.KeyType;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughput;
import com.amazonaws.services.dynamodbv2.model.ResourceInUseException;
import com.amazonaws.services.dynamodbv2.model.ScalarAttributeType;
import com.amazonaws.services.dynamodbv2.model.WriteRequest;


import opennlp.tools.stemmer.PorterStemmer;
import opennlp.tools.stemmer.Stemmer;
import opennlp.tools.tokenize.SimpleTokenizer;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import java.lang.reflect.InvocationTargetException;

import edu.upenn.cis.nets212.config.Config;
import edu.upenn.cis.nets212.storage.DynamoConnector;
import edu.upenn.cis.nets212.storage.SparkConnector;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.sql.SparkSession;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.FileNotFoundException;

/**
 * Callback handler for t.  Parses, breaks words up, and
 * puts them into DynamoDB.
 * 
 * @author zives
 *
 */
public class InvertArticles {
//	static Logger logger = LogManager.getLogger(TalkDescriptionHandler.class);

  final static String tableName = "inverted";
	int row = 0;
	
	SimpleTokenizer model;
	Stemmer stemmer;
	DynamoDB db;
	Table iindex;
	SparkSession spark;
	
	JavaSparkContext context;
	static Logger logger = LogManager.getLogger(InvertArticles.class);

	public InvertArticles()   {
		System.setProperty("file.encoding", "UTF-8");
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

		model = SimpleTokenizer.INSTANCE;
		stemmer = new PorterStemmer();
		
		logger.debug("Connected!");
	}


	/**
	 * Checks if input string is a word made of only
	 * alphabetic letters
	 * @author - pkehinde
	 * */
	public boolean isWord(String sequence) {
		int index = 0;
		while(index != sequence.length()) {
			if(!Character.isLetter(sequence.charAt(index))) {
				return false;
			}
			index++;
		}
		return true;
	}
	/**
	 * Returns a tokenized version of the input String in the 
	 * form of a String array. The tokens are non-stop words and are stemmed
	 * to their root version
	 * */
	public ArrayList<String> breaker(String columnString){
		String [] tokenHolder = model.tokenize(columnString);
		
		List<String> badWords = new LinkedList<String>();
		badWords.add("a");
		badWords.add("all");
		badWords.add("any");
		badWords.add("but");
		badWords.add("the");
		
		
		ArrayList<String> tokens = new ArrayList<String>();
		for(int i = 0; i < tokenHolder.length;i++) {
			if(isWord(tokenHolder[i]) && !badWords.contains(tokenHolder[i]))
					
			 {
				tokens.add((String) stemmer.stem(tokenHolder[i].toLowerCase()));
			}
		}
		return tokens;
	}
	/**
	 * Adds item showing that the word was used in this particular 
	 * Article headline
	 * @param String keyword - word that is related to Ted Talk
	 * @param id - id of Ted Talk
	 * @param link - url of Ted Talk
	 */
	public Item produceItem(String keyword, String link) {
		Item item = new Item()
		.withPrimaryKey("keyword",keyword, "url", link);
		return item;
		
	}


/**
 * Fucntion loads to inverted table on AWS matching keywords to 
 * articles hold them in the headline
 * **/

	public void accept(){

		 ArrayList<JSONObject> json = new ArrayList<JSONObject>();
		    JSONObject obj;
		  
		    
		

		    // This will reference one line at a time
		    String line = null;

		    try {
		        // FileReader reads text files in the default encoding.
		        FileReader fileReader = new FileReader("/home/nets212/G29/news.json");

		        // Always wrap FileReader in BufferedReader.
		        BufferedReader bufferedReader = new BufferedReader(fileReader);
		        int i = 1;
		        while((line = bufferedReader.readLine()) != null && i >= 1) {
		    
		        	i++;
		            json.add((JSONObject) new JSONParser().parse(line));
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
		
		    } catch (ParseException e) {
		   
		        e.printStackTrace();
		    }


		    Map <String, ArrayList<String>> colData = new HashMap<String, ArrayList<String>>();


		for(int i = 0; i < json.size(); i++){
			colData.put((String)json.get(i).get("link"), breaker((String) json.get(i).get("headline")));

		}

		Set <Item> setItems = new HashSet<Item>();
		Set <Item> seen = new HashSet<Item>();
		Iterator <Map.Entry<String, ArrayList<String>>> itr = colData.entrySet().iterator();

		while(itr.hasNext()) {
			Map.Entry<String, ArrayList<String>> curr = (Map.Entry<String, ArrayList<String>>)itr.next();
			ArrayList <String> words = curr.getValue();
			String url = curr.getKey();
			for(int i = 0; i < words.size(); i++) {
				if( !seen.contains(produceItem(words.get(i), url))) {
				setItems.add(produceItem(words.get(i), url));
				seen.add(produceItem(words.get(i), url));
				}
				if(setItems.size() >= 1 && (setItems.size() == 25 || i == words.size() - 1)) {
					
					TableWriteItems data = new TableWriteItems("inverted").withItemsToPut(setItems);
					BatchWriteItemOutcome outcome = db.batchWriteItem(data);
					Map<String, List<WriteRequest>> unprocessedItems = outcome.getUnprocessedItems();
					if (!outcome.getUnprocessedItems().isEmpty()) {
	                 
	                    outcome = db.batchWriteItemUnprocessed(unprocessedItems);
	                }
					setItems.clear();
				}
				
			}
			
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
		accept();

		
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
		final InvertArticles cr = new InvertArticles();

		try {
			
			cr.initialize();

			cr.run();
		} catch (final IOException ie) {
			
			System.err.println("I/O error: ");
			ie.printStackTrace();
		} catch (final InterruptedException e) {
			e.printStackTrace();
		} finally {
			cr.shutdown();
			
		}
	}

}
